import type {
  CvContent,
  EntryRecord,
  Profile,
  SkillGroupRecord,
  TimelineEntry,
} from "../../app/data/cv";
import { asc, desc, eq, notInArray, sql } from "drizzle-orm";
import { cvEntries, cvProfile, cvVariantEntries, cvVariants, skillGroups } from "../db/schema";
import { createError } from "h3";
import { listProjects } from "./projects";
import { useDb } from "./db";

type EntryRow = typeof cvEntries.$inferSelect;
type Tx = Parameters<Parameters<ReturnType<typeof useDb>["transaction"]>[0]>[0];

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

/** All timeline entries, newest first, as the desk edits them. */
async function listEntries(): Promise<EntryRecord[]> {
  const rows = await useDb()
    .select()
    .from(cvEntries)
    .orderBy(desc(cvEntries.from), asc(cvEntries.id));

  return rows.map((row) => toRecord(row));
}

/** All skill groups, in order, as the desk edits them. */
async function listSkillGroups(): Promise<SkillGroupRecord[]> {
  const rows = await useDb()
    .select()
    .from(skillGroups)
    .orderBy(asc(skillGroups.position), asc(skillGroups.id));

  return rows.map((row) => ({
    label: row.id,
    name: row.name,
    note: row.note,
    title: row.title,
    items: row.items,
  }));
}

/** The CV's header, the one row of cv_profile. */
async function loadProfile(): Promise<Profile> {
  const [row] = await useDb().select().from(cvProfile).where(eq(cvProfile.id, 1));

  if (!row) {
    throw createError({ statusCode: 500, message: "No CV profile in the database." });
  }

  return {
    name: row.name,
    role: row.role,
    location: row.location,
    email: row.email,
    phone: row.phone,
    coreTechnologies: row.coreTechnologies,
    links: row.links,
  };
}

/**
 * Everything variants pick from, in the shapes the site renders. Each field is
 * copied by name, so desk-only names and notes never reach the site or the PDF.
 */
async function loadCvContent(): Promise<CvContent> {
  const [profile, entries, skills, projects] = await Promise.all([
    loadProfile(),
    listEntries(),
    listSkillGroups(),
    listProjects(),
  ]);

  return {
    profile,
    experience: entries
      .filter((entry) => entry.section === "experience")
      .map((entry) => toTimelineEntry(entry)),
    education: entries
      .filter((entry) => entry.section === "education")
      .map((entry) => toTimelineEntry(entry)),
    skills: skills.map((group) => ({ label: group.label, title: group.title, items: group.items })),
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      tech: project.tech,
      url: project.url,
    })),
  };
}

/** The entry with this id; a 404 error if there is none. */
async function requireEntry(id: string): Promise<EntryRecord> {
  const [row] = await useDb().select().from(cvEntries).where(eq(cvEntries.id, id));

  if (!row) {
    throw createError({ statusCode: 404, message: `No CV entry "${id}".` });
  }

  return toRecord(row);
}

/** Content changed, so every variant's page check is out of date. */
async function forgetPageChecks(tx: Tx) {
  await tx.update(cvVariants).set({ pageFillsBuild: "" });
}

/** Takes bullets an entry no longer has out of every variant that picks them. */
async function dropBullets(tx: Tx, entryId: string, keep: string[]) {
  await tx
    .update(cvVariantEntries)
    .set({
      bullets: sql`array(select bullet from unnest(${cvVariantEntries.bullets}) as bullet where bullet = any(${sql.param(keep)}::text[]))`,
    })
    .where(eq(cvVariantEntries.entryId, entryId));
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

/**
 * Creates an entry (409 if the id is taken) or updates one (404 if missing).
 * Its section never changes. Bullets it no longer has leave the variants.
 */
async function saveEntry(entry: EntryRecord, { create }: { create: boolean }) {
  await useDb().transaction(async (tx) => {
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
      throw create
        ? createError({ statusCode: 409, message: `CV entry "${entry.id}" exists.` })
        : createError({ statusCode: 404, message: `No CV entry "${entry.id}".` });
    }

    await dropBullets(
      tx,
      entry.id,
      entry.bullets.map((bullet) => bullet.id),
    );
    await forgetPageChecks(tx);
  });
}

/** Deletes an entry and takes it out of every variant. */
async function deleteEntry(id: string) {
  await useDb().transaction(async (tx) => {
    const deleted = await tx
      .delete(cvEntries)
      .where(eq(cvEntries.id, id))
      .returning({ id: cvEntries.id });

    if (deleted.length === 0) {
      throw createError({ statusCode: 404, message: `No CV entry "${id}".` });
    }

    await tx.delete(cvVariantEntries).where(eq(cvVariantEntries.entryId, id));
    await forgetPageChecks(tx);
  });
}

/**
 * Replaces all skill groups with these, in this order. Groups left out are
 * deleted and taken out of every variant.
 */
async function saveSkillGroups(groups: SkillGroupRecord[]) {
  const ids = groups.map((group) => group.label);

  await useDb().transaction(async (tx) => {
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

    await tx.update(cvVariants).set({
      skills: sql`array(select skill from unnest(${cvVariants.skills}) as skill where skill = any(${sql.param(ids)}::text[]))`,
    });
    await forgetPageChecks(tx);
  });
}

/** Writes the profile; every variant prints it, so their page checks are out of date. */
async function saveProfile(profile: Profile) {
  await useDb().transaction(async (tx) => {
    const columns = { ...profile, updatedAt: new Date() };

    await tx
      .insert(cvProfile)
      .values({ id: 1, ...columns })
      .onConflictDoUpdate({ target: cvProfile.id, set: columns });
    await forgetPageChecks(tx);
  });
}

export {
  deleteEntry,
  listEntries,
  listSkillGroups,
  loadCvContent,
  loadProfile,
  requireEntry,
  saveEntry,
  saveProfile,
  saveSkillGroups,
};
