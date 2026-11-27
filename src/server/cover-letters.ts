import "server-only";
import { Effect } from "effect";
import type { CoverLetter, CoverLetterRecord, PrintedCoverLetter } from "../data/cover-letters";
import { applications, coverLetters } from "../../server/db/schema";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { currentBuild, requireCv } from "./cvs";
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
import { HttpError } from "./http";
import { findApplicationEffect } from "./applications";
import { loadProfile } from "./cv-content";
import { printedLetter } from "../lib/cover-letter";

type LetterRow = typeof coverLetters.$inferSelect;

type SaveCoverLetterOutcome =
  | { readonly _tag: "Saved" }
  | { readonly _tag: "ApplicationHasLetter"; readonly otherId: string }
  | { readonly _tag: "AlreadyExists" }
  | { readonly _tag: "NotFound" };

function toLetter(row: LetterRow): CoverLetter {
  return {
    id: row.id,
    label: row.label,
    note: row.note,
    applicationId: row.applicationId,
    recipient: row.recipient,
    language: row.language,
    letterDate: row.letterDate,
    subject: row.subject,
    salutation: row.salutation,
    body: row.body,
    closing: row.closing,
  };
}

function notFound(id: string) {
  return new NotFoundError({ message: `No cover letter "${id}".` });
}

/** All cover letters, newest first, each with its page check on this build and its job. */
function listCoverLettersEffect(): Effect.Effect<
  CoverLetterRecord[],
  DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const build = currentBuild();
    const rows = yield* dbQuery(
      (db) =>
        db
          .select({
            letter: coverLetters,
            company: applications.company,
            jobTitle: applications.jobTitle,
          })
          .from(coverLetters)
          .innerJoin(applications, eq(coverLetters.applicationId, applications.id))
          .orderBy(desc(coverLetters.createdAt), asc(coverLetters.id)),
      "Failed to list cover letters.",
    );

    return rows.map(({ letter, company, jobTitle }) =>
      Object.assign(toLetter(letter), {
        pageFills: letter.pageFillsBuild === build ? letter.pageFills : [],
        application: { company, jobTitle },
      }),
    );
  });
}

/** All cover letters, newest first, each with its page check on this build and its job. */
function listCoverLetters(): Promise<CoverLetterRecord[]> {
  return runServerEffect(listCoverLettersEffect());
}

/** The cover letter with this id; a 404 error if there is none. */
function requireCoverLetterEffect(
  id: string,
): Effect.Effect<CoverLetter, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) => db.select().from(coverLetters).where(eq(coverLetters.id, id)),
      `Failed to load cover letter "${id}".`,
    );

    if (!row) {
      return yield* notFound(id);
    }

    return toLetter(row);
  });
}

/** The cover letter with this id; a 404 error if there is none. */
function requireCoverLetter(id: string): Promise<CoverLetter> {
  return runServerEffect(requireCoverLetterEffect(id));
}

function letterColumns(letter: CoverLetter) {
  // A saved letter has to be measured again.
  return { ...letter, pageFills: [], pageFillsBuild: "", updatedAt: new Date() };
}

/** Creates a cover letter (409 if the id is taken) or updates one (404 if missing). */
function saveCoverLetterEffect(
  letter: CoverLetter,
  { create }: { create: boolean },
): Effect.Effect<
  void,
  BadRequestError | ConflictError | NotFoundError | DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const application = yield* findApplicationEffect(letter.applicationId);

    if (application === undefined) {
      return yield* new BadRequestError({ message: `No application "${letter.applicationId}".` });
    }

    const outcome = yield* dbTransaction<SaveCoverLetterOutcome>(async (tx) => {
      // An application has at most one letter.
      const [other] = await tx
        .select({ id: coverLetters.id })
        .from(coverLetters)
        .where(
          and(eq(coverLetters.applicationId, letter.applicationId), ne(coverLetters.id, letter.id)),
        );

      if (other !== undefined) {
        return { _tag: "ApplicationHasLetter", otherId: other.id };
      }

      const written = create
        ? await tx
            .insert(coverLetters)
            .values(letterColumns(letter))
            .onConflictDoNothing({ target: coverLetters.id })
            .returning({ id: coverLetters.id })
        : await tx
            .update(coverLetters)
            .set(letterColumns(letter))
            .where(eq(coverLetters.id, letter.id))
            .returning({ id: coverLetters.id });

      if (written.length === 0) {
        return create ? { _tag: "AlreadyExists" } : { _tag: "NotFound" };
      }

      return { _tag: "Saved" };
    }, `Failed to save cover letter "${letter.id}".`).pipe(
      Effect.catchTag("DatabaseError", (error) =>
        Effect.gen(function* () {
          if (isPgErrorCode(error, "23505")) {
            return yield* new ConflictError({
              message: `Application "${letter.applicationId}" has a cover letter already.`,
              cause: error,
            });
          }

          return yield* error;
        }),
      ),
    );

    if (outcome._tag === "ApplicationHasLetter") {
      return yield* new ConflictError({
        message: `Application "${letter.applicationId}" has a cover letter already: "${outcome.otherId}".`,
      });
    }

    if (outcome._tag === "AlreadyExists") {
      return yield* new ConflictError({ message: `Cover letter "${letter.id}" exists.` });
    }

    if (outcome._tag === "NotFound") {
      return yield* notFound(letter.id);
    }

    return undefined;
  });
}

/** Creates a cover letter (409 if the id is taken) or updates one (404 if missing). */
function saveCoverLetter(letter: CoverLetter, options: { create: boolean }): Promise<void> {
  return runServerEffect(saveCoverLetterEffect(letter, options));
}

function deleteCoverLetterEffect(
  id: string,
): Effect.Effect<void, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const deleted = yield* dbQuery(
      (db) =>
        db.delete(coverLetters).where(eq(coverLetters.id, id)).returning({ id: coverLetters.id }),
      `Failed to delete cover letter "${id}".`,
    );

    if (deleted.length === 0) {
      return yield* notFound(id);
    }

    return undefined;
  });
}

function deleteCoverLetter(id: string): Promise<void> {
  return runServerEffect(deleteCoverLetterEffect(id));
}

/** Stores how full each page was, marked with the build that printed it. */
function storeCoverLetterFillsEffect(
  id: string,
  fills: number[],
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) =>
      db
        .update(coverLetters)
        .set({ pageFills: fills, pageFillsBuild: currentBuild() })
        .where(eq(coverLetters.id, id)),
    `Failed to store page fills for cover letter "${id}".`,
  ).pipe(Effect.asVoid);
}

/** Stores how full each page was, marked with the build that printed it. */
function storeCoverLetterFills(id: string, fills: number[]): Promise<void> {
  return runServerEffect(storeCoverLetterFillsEffect(id, fills));
}

/** What the print page shows; the role is that of the application's CV. */
function printCoverLetterEffect(
  id: string,
): Effect.Effect<PrintedCoverLetter, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const letter = yield* requireCoverLetterEffect(id);
    const [profile, application] = yield* Effect.all(
      [
        Effect.tryPromise({
          try: () => loadProfile(),
          catch: (cause) =>
            new DatabaseError({
              message: cause instanceof HttpError ? cause.message : "Failed to load CV profile.",
              cause,
            }),
        }),
        findApplicationEffect(letter.applicationId),
      ],
      { concurrency: "unbounded" },
    );
    const cvId = application?.cvId ?? "";
    const cv =
      cvId === ""
        ? undefined
        : yield* Effect.tryPromise({
            try: () => requireCv(cvId),
            catch: (cause) =>
              cause instanceof HttpError && cause.status === 404
                ? new NotFoundError({ message: cause.message, cause })
                : new DatabaseError({
                    message:
                      cause instanceof HttpError ? cause.message : `Failed to load CV "${cvId}".`,
                    cause,
                  }),
          });

    return printedLetter(letter, profile, cv?.role);
  });
}

/** What the print page shows; the role is that of the application's CV. */
function printCoverLetter(id: string): Promise<PrintedCoverLetter> {
  return runServerEffect(printCoverLetterEffect(id));
}

export {
  deleteCoverLetter,
  deleteCoverLetterEffect,
  listCoverLetters,
  listCoverLettersEffect,
  printCoverLetter,
  printCoverLetterEffect,
  requireCoverLetter,
  requireCoverLetterEffect,
  saveCoverLetter,
  saveCoverLetterEffect,
  storeCoverLetterFills,
  storeCoverLetterFillsEffect,
};
