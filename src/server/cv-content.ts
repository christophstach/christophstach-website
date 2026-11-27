import "server-only";
import { Effect } from "effect";
import { asc, desc, eq, max, notInArray, or, sql } from "drizzle-orm";
import {
  coverLetters,
  cvEntries,
  cvEntryPicks,
  cvProfile,
  cvs,
  projects,
  skillGroups,
} from "../../server/db/schema";
import type {
  CvContent,
  EntryRecord,
  Profile,
  SkillGroup,
  SkillGroupRecord,
  TimelineEntry,
} from "../data/cv";
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
} from "./effect";
import { listProjectsEffect } from "./projects";

type EntryRow = typeof cvEntries.$inferSelect;

type SaveEntryOutcome = { ok: true } | { ok: false; reason: "conflict" | "not_found" };

type DeleteEntryOutcome = { ok: true } | { ok: false; reason: "not_found" };

interface CvHomeExperience {
  from: string;
  to?: string;
  organization: string;
}

interface CvHomePersonSummary {
  jobTitle: string;
  worksFor: string;
  knowsAbout: string[];
}

interface CvHomeSummary {
  experience: CvHomeExperience[];
  degreeCount: number;
  skillGroups: SkillGroup[];
  personSummary: CvHomePersonSummary;
}

/** Matches academic degrees so apprenticeships aren't counted as degrees. */
const DEGREE_TITLE =
  /\b(?:b\.?\s*sc|m\.?\s*sc|b\.?\s*a|m\.?\s*a|b\.?\s*eng|m\.?\s*eng|ph\.?\s*d|bachelor|master|diplom|degree)\b/iu;

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

/**
 * Everything CVs pick from, in the shapes the site renders. Each field is
 * copied by name, so desk-only names and notes never reach the site or the PDF.
 */
function loadCvContentEffect(): Effect.Effect<CvContent, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [profile, entries, skills, projectList] = yield* Effect.all(
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
      projects: projectList.map((project) => ({
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
 * Lean public query for the home page and single-source Person JSON-LD: selects
 * only entry dates/titles/organizations, skill groups, and profile role — never
 * bullets, links, desk notes, or projects.
 */
function loadCvHomeEffect(): Effect.Effect<CvHomeSummary, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [entryRows, skillRows, profileRows] = yield* Effect.all(
      [
        dbQuery(
          (db) =>
            db
              .select({
                section: cvEntries.section,
                title: cvEntries.title,
                organization: cvEntries.organization,
                from: cvEntries.from,
                to: cvEntries.to,
              })
              .from(cvEntries)
              .orderBy(desc(cvEntries.from), asc(cvEntries.id)),
          "Failed to load CV home entries.",
        ),
        dbQuery(
          (db) =>
            db
              .select({
                id: skillGroups.id,
                title: skillGroups.title,
                items: skillGroups.items,
              })
              .from(skillGroups)
              .orderBy(asc(skillGroups.position), asc(skillGroups.id)),
          "Failed to load CV home skill groups.",
        ),
        dbQuery(
          (db) => db.select({ role: cvProfile.role }).from(cvProfile).where(eq(cvProfile.id, 1)),
          "Failed to load CV home profile.",
        ),
      ],
      { concurrency: "unbounded" },
    );

    const experienceRows = entryRows.filter((row) => row.section === "experience");
    const educationRows = entryRows.filter((row) => row.section === "education");
    const matchedDegrees = educationRows.filter((row) => DEGREE_TITLE.test(row.title));
    const degreeCount = matchedDegrees.length > 0 ? matchedDegrees.length : educationRows.length;

    const groups: SkillGroup[] = skillRows.map((row) => ({
      label: row.id,
      title: row.title,
      items: row.items,
    }));

    const currentJob = experienceRows.find((row) => row.to === "") ?? experienceRows[0];
    const profileRole = profileRows[0]?.role ?? "";

    return {
      experience: experienceRows.map(({ from, to, organization }) =>
        to === "" ? { from, organization } : { from, to, organization },
      ),
      degreeCount,
      skillGroups: groups,
      personSummary: {
        jobTitle: currentJob?.title || profileRole,
        worksFor: currentJob?.organization ?? "",
        knowsAbout: [...new Set(groups.flatMap((group) => group.items))],
      },
    };
  });
}

/**
 * Latest `updatedAt` ISO date string across public CV tables (`cv_profile`,
 * `cv_entries`, `projects`, and public `cvs`; `skill_groups` has no timestamp
 * column), or `null` if no rows exist.
 */
function loadPublicSitemapUpdatedAtEffect(): Effect.Effect<
  string | null,
  DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const [profileMax, entriesMax, projectsMax, cvsMax] = yield* Effect.all(
      [
        dbQuery(
          (db) => db.select({ updatedAt: max(cvProfile.updatedAt) }).from(cvProfile),
          "Failed to load CV profile update time.",
        ),
        dbQuery(
          (db) => db.select({ updatedAt: max(cvEntries.updatedAt) }).from(cvEntries),
          "Failed to load CV entries update time.",
        ),
        dbQuery(
          (db) => db.select({ updatedAt: max(projects.updatedAt) }).from(projects),
          "Failed to load projects update time.",
        ),
        dbQuery(
          (db) =>
            db
              .select({ updatedAt: max(cvs.updatedAt) })
              .from(cvs)
              .where(or(eq(cvs.isPrimary, true), eq(cvs.isWebsite, true))),
          "Failed to load public CVs update time.",
        ),
      ],
      { concurrency: "unbounded" },
    );

    const candidates = [
      profileMax[0]?.updatedAt,
      entriesMax[0]?.updatedAt,
      projectsMax[0]?.updatedAt,
      cvsMax[0]?.updatedAt,
    ].filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));

    if (candidates.length === 0) {
      return null;
    }

    const latest = candidates.reduce((newest, candidate) =>
      candidate.getTime() > newest.getTime() ? candidate : newest,
    );

    return latest.toISOString();
  });
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

export {
  deleteEntryEffect,
  listEntriesEffect,
  listSkillGroupsEffect,
  loadCvContentEffect,
  loadCvHomeEffect,
  loadProfileEffect,
  loadPublicSitemapUpdatedAtEffect,
  requireEntryEffect,
  saveEntryEffect,
  saveProfileEffect,
  saveSkillGroupsEffect,
};
export type { CvHomeExperience, CvHomePersonSummary, CvHomeSummary };
