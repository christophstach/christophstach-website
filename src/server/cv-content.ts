import "server-only";
import { Effect } from "effect";
import { asc, desc, eq, notInArray, sql } from "drizzle-orm";
import {
  coverLetters,
  cvEntries,
  cvEntryPicks,
  cvProfile,
  cvs,
  skillGroups,
} from "../../server/db/schema";
import type { CvContent, EntryRecord, Profile, SkillGroupRecord, TimelineEntry } from "../data/cv";
import type { DatabaseTransaction } from "./db";
import {
  type ConfigError,
  ConflictError,
  type Database,
  DatabaseError,
  NotFoundError,
  dbQuery,
  dbTransaction,
  isPgErrorCode,
  runServerEffect,
} from "./effect";
import { listProjectsEffect } from "./projects";

type EntryRow = typeof cvEntries.$inferSelect;

type SaveEntryOutcome = { ok: true } | { ok: false; reason: "conflict" | "not_found" };

type DeleteEntryOutcome = { ok: true } | { ok: false; reason: "not_found" };

function toRecord(row: EntryRow): EntryRecord {
  return {
    id: row.id,
    section: row.section,
    name: row.name,
    note: row.note,
    title: row.title,
    organization: row.organization,
    location: row.location,
    from: row.from,
    to: row.to,
    tech: row.tech,
    bullets: row.bullets,
    links: row.links,
  };
}

/** The shape the site renders: empty fields left out, bullets keyed by id. */
function toTimelineEntry(record: EntryRecord): TimelineEntry {
  return {
    id: record.id,
    title: record.title,
    organization: record.organization,
    ...(record.location ? { location: record.location } : {}),
    from: record.from,
    ...(record.to ? { to: record.to } : {}),
    ...(record.tech.length > 0 ? { tech: record.tech } : {}),
    bullets: Object.fromEntries(record.bullets.map((bullet) => [bullet.id, bullet.text])),
    ...(record.links.length > 0 ? { links: record.links } : {}),
  };
}

function entryNotFound(id: string): NotFoundError {
  return new NotFoundError({ message: `No CV entry "${id}".` });
}

/** Content changed, so every CV's page check is out of date. */
async function forgetPageChecks(tx: DatabaseTransaction) {
  await tx.update(cvs).set({ pageFillsBuild: "" });
}

/** Takes bullets an entry no longer has out of every CV that picks them. */
async function dropBullets(tx: DatabaseTransaction, entryId: string, keep: string[]) {
  await tx
    .update(cvEntryPicks)
    .set({
      bullets: sql`array(select bullet from unnest(${cvEntryPicks.bullets}) as bullet where bullet = any(${sql.param(keep)}::text[]))`,
    })
    .where(eq(cvEntryPicks.entryId, entryId));
}

function entryColumns(entry: EntryRecord) {
  return {
    name: entry.name,
    note: entry.note,
    title: entry.title,
    organization: entry.organization,
    location: entry.location,
    from: entry.from,
    to: entry.to,
    tech: entry.tech,
    bullets: entry.bullets,
    links: entry.links,
    updatedAt: new Date(),
  };
}

/** All timeline entries, newest first, as the desk edits them. */
function listEntriesEffect(): Effect.Effect<EntryRecord[], DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const rows = yield* dbQuery(
      (db) => db.select().from(cvEntries).orderBy(desc(cvEntries.from), asc(cvEntries.id)),
      "Failed to list CV entries.",
    );

    return rows.map((row) => toRecord(row));
  });
}

/** All timeline entries, newest first, as the desk edits them. */
function listEntries(): Promise<EntryRecord[]> {
  return runServerEffect(listEntriesEffect());
}

/** All skill groups, in order, as the desk edits them. */
function listSkillGroupsEffect(): Effect.Effect<
  SkillGroupRecord[],
  DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const rows = yield* dbQuery(
      (db) => db.select().from(skillGroups).orderBy(asc(skillGroups.position), asc(skillGroups.id)),
      "Failed to list skill groups.",
    );

    return rows.map((row) => ({
      label: row.id,
      name: row.name,
      note: row.note,
      title: row.title,
      items: row.items,
    }));
  });
}

/** All skill groups, in order, as the desk edits them. */
function listSkillGroups(): Promise<SkillGroupRecord[]> {
  return runServerEffect(listSkillGroupsEffect());
}

/** The CV's header, the one row of cv_profile. */
function loadProfileEffect(): Effect.Effect<Profile, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) => db.select().from(cvProfile).where(eq(cvProfile.id, 1)),
      "Failed to load CV profile.",
    );

    if (!row) {
      return yield* new DatabaseError({ message: "No CV profile in the database." });
    }

    return {
      name: row.name,
      role: row.role,
      location: row.location,
      email: row.email,
      phone: row.phone,
      links: row.links,
    };
  });
}

/** The CV's header, the one row of cv_profile. */
function loadProfile(): Promise<Profile> {
  return runServerEffect(loadProfileEffect());
}

/**
 * Everything CVs pick from, in the shapes the site renders. Each field is
 * copied by name, so desk-only names and notes never reach the site or the PDF.
 */
function loadCvContentEffect(): Effect.Effect<CvContent, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [profile, entries, skills, projects] = yield* Effect.all(
      [loadProfileEffect(), listEntriesEffect(), listSkillGroupsEffect(), listProjectsEffect()],
      { concurrency: "unbounded" },
    );

    return {
      profile,
      experience: entries
        .filter((entry) => entry.section === "experience")
        .map((entry) => toTimelineEntry(entry)),
      education: entries
        .filter((entry) => entry.section === "education")
        .map((entry) => toTimelineEntry(entry)),
      skills: skills.map((group) => ({
        label: group.label,
        title: group.title,
        items: group.items,
      })),
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        tech: project.tech,
        url: project.url,
      })),
    };
  });
}

/**
 * Everything CVs pick from, in the shapes the site renders. Each field is
 * copied by name, so desk-only names and notes never reach the site or the PDF.
 */
function loadCvContent(): Promise<CvContent> {
  return runServerEffect(loadCvContentEffect());
}

/** The entry with this id; a 404 error if there is none. */
function requireEntryEffect(
  id: string,
): Effect.Effect<EntryRecord, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) => db.select().from(cvEntries).where(eq(cvEntries.id, id)),
      `Failed to load CV entry "${id}".`,
    );

    if (!row) {
      return yield* entryNotFound(id);
    }

    return toRecord(row);
  });
}

/** The entry with this id; a 404 error if there is none. */
function requireEntry(id: string): Promise<EntryRecord> {
  return runServerEffect(requireEntryEffect(id));
}

/**
 * Creates an entry (409 if the id is taken) or updates one (404 if missing).
 * Its section never changes. Bullets it no longer has leave the CVs.
 */
function saveEntryEffect(
  entry: EntryRecord,
  { create }: { create: boolean },
): Effect.Effect<void, ConflictError | NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const outcome = yield* dbTransaction<SaveEntryOutcome>(async (tx) => {
      const written = create
        ? await tx
            .insert(cvEntries)
            .values({ id: entry.id, section: entry.section, ...entryColumns(entry) })
            .onConflictDoNothing()
            .returning({ id: cvEntries.id })
        : await tx
            .update(cvEntries)
            .set(entryColumns(entry))
            .where(eq(cvEntries.id, entry.id))
            .returning({ id: cvEntries.id });

      if (written.length === 0) {
        return { ok: false, reason: create ? "conflict" : "not_found" };
      }

      await dropBullets(
        tx,
        entry.id,
        entry.bullets.map((bullet) => bullet.id),
      );
      await forgetPageChecks(tx);

      return { ok: true };
    }, `Failed to save CV entry "${entry.id}".`).pipe(
      Effect.catchTag(
        "DatabaseError",
        (error): Effect.Effect<never, ConflictError | DatabaseError> =>
          isPgErrorCode(error, "23505")
            ? new ConflictError({ message: `CV entry "${entry.id}" exists.`, cause: error })
            : error,
      ),
    );

    if (!outcome.ok) {
      if (outcome.reason === "conflict") {
        return yield* new ConflictError({ message: `CV entry "${entry.id}" exists.` });
      }

      return yield* entryNotFound(entry.id);
    }

    return undefined;
  });
}

/**
 * Creates an entry (409 if the id is taken) or updates one (404 if missing).
 * Its section never changes. Bullets it no longer has leave the CVs.
 */
function saveEntry(entry: EntryRecord, options: { create: boolean }): Promise<void> {
  return runServerEffect(saveEntryEffect(entry, options));
}

/** Deletes an entry and takes it out of every CV. */
function deleteEntryEffect(
  id: string,
): Effect.Effect<void, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const outcome = yield* dbTransaction<DeleteEntryOutcome>(async (tx) => {
      const deleted = await tx
        .delete(cvEntries)
        .where(eq(cvEntries.id, id))
        .returning({ id: cvEntries.id });

      if (deleted.length === 0) {
        return { ok: false, reason: "not_found" };
      }

      await tx.delete(cvEntryPicks).where(eq(cvEntryPicks.entryId, id));
      await forgetPageChecks(tx);

      return { ok: true };
    }, `Failed to delete CV entry "${id}".`);

    if (!outcome.ok) {
      return yield* entryNotFound(id);
    }

    return undefined;
  });
}

/** Deletes an entry and takes it out of every CV. */
function deleteEntry(id: string): Promise<void> {
  return runServerEffect(deleteEntryEffect(id));
}

/**
 * Replaces all skill groups with these, in this order. Groups left out are
 * deleted and taken out of every CV.
 */
function saveSkillGroupsEffect(
  groups: SkillGroupRecord[],
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  const ids = groups.map((group) => group.label);

  return dbTransaction(async (tx) => {
    await (ids.length > 0
      ? tx.delete(skillGroups).where(notInArray(skillGroups.id, ids))
      : tx.delete(skillGroups));

    // One after the other: a transaction runs on a single connection.
    await groups.reduce(async (previous, group, position) => {
      await previous;

      const columns = {
        name: group.name,
        note: group.note,
        title: group.title,
        items: group.items,
        position,
      };

      await tx
        .insert(skillGroups)
        .values({ id: group.label, ...columns })
        .onConflictDoUpdate({ target: skillGroups.id, set: columns });
    }, Promise.resolve());

    await tx.update(cvs).set({
      skills: sql`array(select skill from unnest(${cvs.skills}) as skill where skill = any(${sql.param(ids)}::text[]))`,
    });
    await forgetPageChecks(tx);
  }, "Failed to save skill groups.");
}

/**
 * Replaces all skill groups with these, in this order. Groups left out are
 * deleted and taken out of every CV.
 */
function saveSkillGroups(groups: SkillGroupRecord[]): Promise<void> {
  return runServerEffect(saveSkillGroupsEffect(groups));
}

/** Writes the profile; CVs and letters print it, so their page checks are out of date. */
function saveProfileEffect(
  profile: Profile,
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  return dbTransaction(async (tx) => {
    const columns = { ...profile, updatedAt: new Date() };

    await tx
      .insert(cvProfile)
      .values({ id: 1, ...columns })
      .onConflictDoUpdate({ target: cvProfile.id, set: columns });
    await forgetPageChecks(tx);
    await tx.update(coverLetters).set({ pageFillsBuild: "" });
  }, "Failed to save CV profile.");
}

/** Writes the profile; CVs and letters print it, so their page checks are out of date. */
function saveProfile(profile: Profile): Promise<void> {
  return runServerEffect(saveProfileEffect(profile));
}

export {
  deleteEntry,
  deleteEntryEffect,
  listEntries,
  listEntriesEffect,
  listSkillGroups,
  listSkillGroupsEffect,
  loadCvContent,
  loadCvContentEffect,
  loadProfile,
  loadProfileEffect,
  requireEntry,
  requireEntryEffect,
  saveEntry,
  saveEntryEffect,
  saveProfile,
  saveProfileEffect,
  saveSkillGroups,
  saveSkillGroupsEffect,
};
