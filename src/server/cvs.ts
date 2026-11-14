import "server-only";
import type { Cv, EntryPick } from "../data/cvs";
import { DEFAULT_CV_LAYOUT, normalizeCvLayout } from "../data/cv-print-layout";
import { asc, eq, ne, sql } from "drizzle-orm";
import { cvEntryPicks, cvs } from "../../server/db/schema";
import { BUILD_ID } from "../build-id";
import { HttpError } from "./http";
import type { CvBody } from "./cv-body";
import { loadCvContent } from "./cv-content";
import { printCv } from "../lib/cv";
import { useDb } from "./db";

type Section = "experience" | "education";
/** The two public roles a CV can hold, each held by exactly one CV. */
type Mark = "isPrimary" | "isWebsite";
type CvRow = typeof cvs.$inferSelect & {
  entries: (typeof cvEntryPicks.$inferSelect)[];
};

const SECTIONS: Section[] = ["experience", "education"];

function picks(row: CvRow, section: Section): EntryPick[] {
  return row.entries
    .filter((entry) => entry.section === section)
    .toSorted((first, second) => first.position - second.position)
    .map((entry) => ({ id: entry.entryId, bullets: entry.bullets }));
}

function toCv(row: CvRow): Cv {
  return {
    id: row.id,
    label: row.label,
    note: row.note,
    role: row.role,
    summary: row.summary,
    coreTechnologies: row.coreTechnologies,
    experience: picks(row, "experience"),
    education: picks(row, "education"),
    projects: row.projects,
    skills: row.skills,
    layout: normalizeCvLayout(row.layout),
  };
}

function notFound(id: string) {
  return new HttpError(404, `No CV "${id}".`);
}

/** This deployment's build; page checks from other builds are out of date. */
function currentBuild(): string {
  return BUILD_ID;
}

/**
 * All CVs, oldest first, each with when it was last saved and its last
 * page check (empty if there was none on this build); and the ids of the
 * primary and the website one.
 */
async function listCvs() {
  const build = currentBuild();
  const rows = await useDb().query.cvs.findMany({
    with: { entries: true },
    orderBy: [asc(cvs.createdAt), asc(cvs.id)],
  });

  return {
    cvs: rows.map((row) => ({
      ...toCv(row),
      updatedAt: row.updatedAt.toISOString(),
      pageFills: row.pageFillsBuild === build ? row.pageFills : [],
    })),
    primaryId: rows.find((row) => row.isPrimary)?.id ?? "",
    websiteId: rows.find((row) => row.isWebsite)?.id ?? "",
  };
}

/** The CV with this id; a 404 error if there is none. */
async function requireCv(id: string): Promise<Cv> {
  const row = await useDb().query.cvs.findFirst({
    where: eq(cvs.id, id),
    with: { entries: true },
  });

  if (!row) {
    throw notFound(id);
  }

  return toCv(row);
}

/**
 * The CV holding a public role: isPrimary for /cv-print and the
 * downloadable PDF, isWebsite for /curriculum.
 */
async function requireMarkedCv(mark: Mark): Promise<Cv> {
  const row = await useDb().query.cvs.findFirst({
    where: eq(cvs[mark], true),
    with: { entries: true },
  });

  if (!row) {
    throw new HttpError(500, `No CV is marked ${mark}.`);
  }

  return toCv(row);
}

function entryRows(cv: CvBody) {
  return SECTIONS.flatMap((section) =>
    cv[section].map((pick, position) => ({
      cvId: cv.id,
      section,
      position,
      entryId: pick.id,
      bullets: pick.bullets,
    })),
  );
}

function cvColumns(cv: CvBody) {
  return {
    label: cv.label,
    note: cv.note,
    role: cv.role,
    summary: cv.summary,
    ...(cv.coreTechnologies ? { coreTechnologies: cv.coreTechnologies } : {}),
    projects: cv.projects,
    skills: cv.skills,
    ...(cv.layout ? { layout: cv.layout } : {}),
    // The stored page check no longer matches the content.
    pageFills: [],
    updatedAt: new Date(),
  };
}

/**
 * Writes a CV and replaces its entries in one transaction. Content is
 * checked against cv.ts first, so a stored CV always prints.
 */
async function saveCv(cv: CvBody, { create }: { create: boolean }) {
  const content = await loadCvContent();

  try {
    printCv(
      {
        ...cv,
        coreTechnologies: cv.coreTechnologies ?? [],
        layout: cv.layout ?? DEFAULT_CV_LAYOUT,
      },
      content,
    );
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : String(error));
  }

  await useDb().transaction(async (tx) => {
    const written = create
      ? await tx
          .insert(cvs)
          .values({ id: cv.id, ...cvColumns(cv) })
          .onConflictDoNothing()
          .returning({ id: cvs.id })
      : await tx.update(cvs).set(cvColumns(cv)).where(eq(cvs.id, cv.id)).returning({ id: cvs.id });

    if (written.length === 0) {
      throw create ? new HttpError(409, `CV "${cv.id}" exists.`) : notFound(cv.id);
    }

    const rows = entryRows(cv);

    await tx.delete(cvEntryPicks).where(eq(cvEntryPicks.cvId, cv.id));

    if (rows.length > 0) {
      await tx.insert(cvEntryPicks).values(rows);
    }
  });
}

/** A CV's printed content, resolved against the content in the database. */
async function printStoredCv(cv: Cv) {
  return printCv(cv, await loadCvContent());
}

/** Remembers the result of a page check, so the desk overview can show it. */
async function storePageFills(id: string, fills: number[]) {
  await useDb()
    .update(cvs)
    .set({ pageFills: fills, pageFillsBuild: currentBuild() })
    .where(eq(cvs.id, id));
}

/** Gives this CV a public role; the CV that held it loses it. */
async function markCv(id: string, mark: Mark) {
  await requireCv(id);
  // In two steps: a unique index allows one CV per role, and Postgres checks it row by row.
  await useDb().transaction(async (tx) => {
    await tx
      .update(cvs)
      .set({ [mark]: false })
      .where(ne(cvs.id, id));
    await tx
      .update(cvs)
      .set({ [mark]: true })
      .where(eq(cvs.id, id));
  });
}

/** Deletes a CV, but never one with a public role: the site needs it. */
async function deleteCv(id: string) {
  const deleted = await useDb()
    .delete(cvs)
    .where(sql`${cvs.id} = ${id} and not ${cvs.isPrimary} and not ${cvs.isWebsite}`)
    .returning({ id: cvs.id });

  if (deleted.length === 0) {
    await requireCv(id);

    throw new HttpError(
      409,
      "The primary and the website CV can't be deleted. Give the role to another CV first.",
    );
  }
}

/** Throws a 400 unless the id is empty or names a stored CV. */
async function requireLinkedCv(cvId: string) {
  if (!cvId) {
    return;
  }

  const [row] = await useDb().select({ id: cvs.id }).from(cvs).where(eq(cvs.id, cvId));

  if (!row) {
    throw new HttpError(400, `No CV "${cvId}".`);
  }
}

export {
  currentBuild,
  deleteCv,
  listCvs,
  markCv,
  printStoredCv,
  requireMarkedCv,
  requireCv,
  requireLinkedCv,
  saveCv,
  storePageFills,
};
