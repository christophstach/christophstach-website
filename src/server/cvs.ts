import "server-only";
import { Effect } from "effect";
import { asc, eq, ne, sql } from "drizzle-orm";
import { cvEntryPicks, cvs } from "../../server/db/schema";
import { BUILD_ID } from "../build-id";
import { DEFAULT_CV_LAYOUT, normalizeCvLayout } from "../data/cv-print-layout";
import type { Cv, EntryPick } from "../data/cvs";
import { type PrintedCv, printCvEffect } from "../lib/cv";
import type { CvBody } from "./cv-body";
import { loadCvContentEffect } from "./cv-content";
import {
  BadRequestError,
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

type Section = "experience" | "education";
/** The two public roles a CV can hold, each held by exactly one CV. */
type Mark = "isPrimary" | "isWebsite";
type CvRow = typeof cvs.$inferSelect & {
  entries: (typeof cvEntryPicks.$inferSelect)[];
};

type SaveCvOutcome = { ok: true } | { ok: false; reason: "conflict" | "not_found" };

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

function cvNotFound(id: string): NotFoundError {
  return new NotFoundError({ message: `No CV "${id}".` });
}

/** This deployment's build; page checks from other builds are out of date. */
function currentBuild(): string {
  return BUILD_ID;
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
 * All CVs, oldest first, each with when it was last saved and its last
 * page check (empty if there was none on this build); and the ids of the
 * primary and the website one.
 */
function listCvsEffect() {
  return Effect.gen(function* () {
    const build = currentBuild();
    const rows = yield* dbQuery(
      (db) =>
        db.query.cvs.findMany({
          with: { entries: true },
          orderBy: [asc(cvs.createdAt), asc(cvs.id)],
        }),
      "Failed to list CVs.",
    );

    return {
      cvs: rows.map((row) => ({
        ...toCv(row),
        updatedAt: row.updatedAt.toISOString(),
        pageFills: row.pageFillsBuild === build ? row.pageFills : [],
      })),
      primaryId: rows.find((row) => row.isPrimary)?.id ?? "",
      websiteId: rows.find((row) => row.isWebsite)?.id ?? "",
    };
  });
}

/**
 * All CVs, oldest first, each with when it was last saved and its last
 * page check (empty if there was none on this build); and the ids of the
 * primary and the website one.
 */
function listCvs() {
  return runServerEffect(listCvsEffect());
}

/** The CV with this id; a 404 error if there is none. */
function requireCvEffect(
  id: string,
): Effect.Effect<Cv, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const row = yield* dbQuery(
      (db) =>
        db.query.cvs.findFirst({
          where: eq(cvs.id, id),
          with: { entries: true },
        }),
      `Failed to load CV "${id}".`,
    );

    if (!row) {
      return yield* cvNotFound(id);
    }

    return toCv(row);
  });
}

/** The CV with this id; a 404 error if there is none. */
function requireCv(id: string): Promise<Cv> {
  return runServerEffect(requireCvEffect(id));
}

/**
 * The CV holding a public role: isPrimary for /cv-print and the
 * downloadable PDF, isWebsite for /curriculum.
 */
function requireMarkedCvEffect(
  mark: Mark,
): Effect.Effect<Cv, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const row = yield* dbQuery(
      (db) =>
        db.query.cvs.findFirst({
          where: eq(cvs[mark], true),
          with: { entries: true },
        }),
      `Failed to load CV marked ${mark}.`,
    );

    if (!row) {
      return yield* new DatabaseError({ message: `No CV is marked ${mark}.` });
    }

    return toCv(row);
  });
}

/**
 * The CV holding a public role: isPrimary for /cv-print and the
 * downloadable PDF, isWebsite for /curriculum.
 */
function requireMarkedCv(mark: Mark): Promise<Cv> {
  return runServerEffect(requireMarkedCvEffect(mark));
}

/**
 * Writes a CV and replaces its entries in one transaction. Content is
 * checked against cv.ts first, so a stored CV always prints.
 */
function saveCvEffect(
  cv: CvBody,
  { create }: { create: boolean },
): Effect.Effect<
  void,
  BadRequestError | ConflictError | NotFoundError | DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const content = yield* loadCvContentEffect();

    yield* printCvEffect(
      {
        ...cv,
        coreTechnologies: cv.coreTechnologies ?? [],
        layout: cv.layout ?? DEFAULT_CV_LAYOUT,
      },
      content,
    ).pipe(
      Effect.catchTag(
        "CvPrintError",
        (error) => new BadRequestError({ message: error.message, cause: error }),
      ),
    );

    const outcome = yield* dbTransaction<SaveCvOutcome>(async (tx) => {
      const written = create
        ? await tx
            .insert(cvs)
            .values({ id: cv.id, ...cvColumns(cv) })
            .onConflictDoNothing()
            .returning({ id: cvs.id })
        : await tx
            .update(cvs)
            .set(cvColumns(cv))
            .where(eq(cvs.id, cv.id))
            .returning({ id: cvs.id });

      if (written.length === 0) {
        return { ok: false, reason: create ? "conflict" : "not_found" };
      }

      const rows = entryRows(cv);

      await tx.delete(cvEntryPicks).where(eq(cvEntryPicks.cvId, cv.id));

      if (rows.length > 0) {
        await tx.insert(cvEntryPicks).values(rows);
      }

      return { ok: true };
    }, `Failed to save CV "${cv.id}".`).pipe(
      Effect.catchTag(
        "DatabaseError",
        (error): Effect.Effect<never, ConflictError | DatabaseError> =>
          isPgErrorCode(error, "23505")
            ? new ConflictError({ message: `CV "${cv.id}" exists.`, cause: error })
            : error,
      ),
    );

    if (!outcome.ok) {
      if (outcome.reason === "conflict") {
        return yield* new ConflictError({ message: `CV "${cv.id}" exists.` });
      }

      return yield* cvNotFound(cv.id);
    }

    return undefined;
  });
}

/**
 * Writes a CV and replaces its entries in one transaction. Content is
 * checked against cv.ts first, so a stored CV always prints.
 */
function saveCv(cv: CvBody, options: { create: boolean }): Promise<void> {
  return runServerEffect(saveCvEffect(cv, options));
}

/** A CV's printed content, resolved against the content in the database. */
function printStoredCvEffect(
  cv: Cv,
): Effect.Effect<PrintedCv, BadRequestError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const content = yield* loadCvContentEffect();

    return yield* printCvEffect(cv, content).pipe(
      Effect.catchTag(
        "CvPrintError",
        (error) => new BadRequestError({ message: error.message, cause: error }),
      ),
    );
  });
}

/** A CV's printed content, resolved against the content in the database. */
function printStoredCv(cv: Cv): Promise<PrintedCv> {
  return runServerEffect(printStoredCvEffect(cv));
}

/** Remembers the result of a page check, so the desk overview can show it. */
function storePageFillsEffect(
  id: string,
  fills: number[],
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) =>
      db
        .update(cvs)
        .set({ pageFills: fills, pageFillsBuild: currentBuild() })
        .where(eq(cvs.id, id)),
    `Failed to store page fills for CV "${id}".`,
  ).pipe(Effect.asVoid);
}

/** Remembers the result of a page check, so the desk overview can show it. */
function storePageFills(id: string, fills: number[]): Promise<void> {
  return runServerEffect(storePageFillsEffect(id, fills));
}

/** Gives this CV a public role; the CV that held it loses it. */
function markCvEffect(
  id: string,
  mark: Mark,
): Effect.Effect<void, NotFoundError | ConflictError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    yield* requireCvEffect(id);

    // In two steps: a unique index allows one CV per role, and Postgres checks it row by row.
    yield* dbTransaction(async (tx) => {
      await tx
        .update(cvs)
        .set({ [mark]: false })
        .where(ne(cvs.id, id));
      await tx
        .update(cvs)
        .set({ [mark]: true })
        .where(eq(cvs.id, id));
    }, `Failed to mark CV "${id}" as ${mark}.`).pipe(
      Effect.catchTag(
        "DatabaseError",
        (error): Effect.Effect<never, ConflictError | DatabaseError> =>
          isPgErrorCode(error, "23505")
            ? new ConflictError({ message: `Another CV already holds ${mark}.`, cause: error })
            : error,
      ),
    );
  });
}

/** Gives this CV a public role; the CV that held it loses it. */
function markCv(id: string, mark: Mark): Promise<void> {
  return runServerEffect(markCvEffect(id, mark));
}

/** Deletes a CV, but never one with a public role: the site needs it. */
function deleteCvEffect(
  id: string,
): Effect.Effect<void, NotFoundError | ConflictError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const deleted = yield* dbQuery(
      (db) =>
        db
          .delete(cvs)
          .where(sql`${cvs.id} = ${id} and not ${cvs.isPrimary} and not ${cvs.isWebsite}`)
          .returning({ id: cvs.id }),
      `Failed to delete CV "${id}".`,
    );

    if (deleted.length === 0) {
      yield* requireCvEffect(id);

      return yield* new ConflictError({
        message:
          "The primary and the website CV can't be deleted. Give the role to another CV first.",
      });
    }

    return undefined;
  });
}

/** Deletes a CV, but never one with a public role: the site needs it. */
function deleteCv(id: string): Promise<void> {
  return runServerEffect(deleteCvEffect(id));
}

/** Fails with 400 unless the id is empty or names a stored CV. */
function requireLinkedCvEffect(
  cvId: string,
): Effect.Effect<void, BadRequestError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    if (!cvId) {
      return undefined;
    }

    const [row] = yield* dbQuery(
      (db) => db.select({ id: cvs.id }).from(cvs).where(eq(cvs.id, cvId)),
      `Failed to verify linked CV "${cvId}".`,
    );

    if (!row) {
      return yield* new BadRequestError({ message: `No CV "${cvId}".` });
    }

    return undefined;
  });
}

/** Throws a 400 unless the id is empty or names a stored CV. */
function requireLinkedCv(cvId: string): Promise<void> {
  return runServerEffect(requireLinkedCvEffect(cvId));
}

export type { Mark };
export {
  currentBuild,
  deleteCv,
  deleteCvEffect,
  listCvs,
  listCvsEffect,
  markCv,
  markCvEffect,
  printStoredCv,
  printStoredCvEffect,
  requireCv,
  requireCvEffect,
  requireLinkedCv,
  requireLinkedCvEffect,
  requireMarkedCv,
  requireMarkedCvEffect,
  saveCv,
  saveCvEffect,
  storePageFills,
  storePageFillsEffect,
};
