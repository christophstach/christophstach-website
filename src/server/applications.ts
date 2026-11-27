import "server-only";
import { Effect } from "effect";
import type { Application, ApplicationRecord, SentSummary } from "../data/applications";
import { applications, coverLetters } from "../../server/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  type BadRequestError,
  type ConfigError,
  ConflictError,
  type Database,
  type DatabaseError,
  NotFoundError,
  dbQuery,
  isPgErrorCode,
  runServerEffect,
} from "./effect";
import { SALARY_CURRENCIES } from "../data/postings";
import { readSentCopy } from "../data/sent-copy";
import { requireLinkedCvEffect } from "./cvs";

type ApplicationRow = typeof applications.$inferSelect;

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    jobTitle: row.jobTitle,
    jobUrl: row.jobUrl,
    jobDescription: row.jobDescription,
    location: row.location,
    workplace: row.workplace,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: SALARY_CURRENCIES.find((code) => code === row.salaryCurrency) ?? "",
    source: row.source,
    status: row.status,
    cvId: row.cvId ?? "",
    appliedOn: row.appliedOn,
    nextStep: row.nextStep,
    nextStepOn: row.nextStepOn,
    contacts: row.contacts,
    events: row.events,
    note: row.note,
  };
}

function notFound(id: string) {
  return new NotFoundError({ message: `No application "${id}".` });
}

/** What the desk shows of a stored copy; null if there is none. */
function sentSummary(value: unknown): SentSummary | null {
  if (value === null) {
    return null;
  }

  const copy = readSentCopy(value);

  return copy === undefined
    ? { sentAt: "", hasCv: false, letters: [] }
    : {
        sentAt: copy.sentAt,
        hasCv: copy.cv !== null,
        letters: copy.letters.map(({ id, label }) => ({ id, label })),
      };
}

/** All applications, newest first, each with its cover letter. */
function listApplicationsEffect(): Effect.Effect<
  ApplicationRecord[],
  DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const [rows, letters] = yield* Effect.all(
      [
        dbQuery(
          (db) =>
            db
              .select()
              .from(applications)
              .orderBy(desc(applications.createdAt), asc(applications.id)),
          "Failed to list applications.",
        ),
        dbQuery(
          (db) =>
            db
              .select({
                id: coverLetters.id,
                label: coverLetters.label,
                applicationId: coverLetters.applicationId,
              })
              .from(coverLetters),
          "Failed to list application cover letters.",
        ),
      ],
      { concurrency: "unbounded" },
    );

    return rows.map((row) =>
      Object.assign(toApplication(row), {
        letter:
          letters
            .filter((letter) => letter.applicationId === row.id)
            .map(({ id, label }) => ({ id, label }))[0] ?? null,
        postingId: row.postingId ?? "",
        sent: sentSummary(row.sent),
        updatedAt: row.updatedAt.toISOString(),
      }),
    );
  });
}

/** All applications, newest first, each with its cover letter. */
function listApplications(): Promise<ApplicationRecord[]> {
  return runServerEffect(listApplicationsEffect());
}

/** The application with this id; undefined if there is none. */
function findApplicationEffect(
  id: string,
): Effect.Effect<Application | undefined, DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) => db.select().from(applications).where(eq(applications.id, id)),
    `Failed to load application "${id}".`,
  ).pipe(Effect.map(([row]) => (row === undefined ? undefined : toApplication(row))));
}

/** The application with this id; undefined if there is none. */
function findApplication(id: string): Promise<Application | undefined> {
  return runServerEffect(findApplicationEffect(id));
}

function applicationColumns(application: Application) {
  return { ...application, cvId: application.cvId || null, updatedAt: new Date() };
}

/** Creates an application (409 if the id is taken) or updates one (404 if missing). */
function saveApplicationEffect(
  application: Application,
  { create }: { create: boolean },
): Effect.Effect<
  void,
  BadRequestError | ConflictError | NotFoundError | DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    yield* requireLinkedCvEffect(application.cvId);

    const written = yield* dbQuery(
      (db) =>
        create
          ? db
              .insert(applications)
              .values(applicationColumns(application))
              .onConflictDoNothing()
              .returning({ id: applications.id })
          : db
              .update(applications)
              .set(applicationColumns(application))
              .where(eq(applications.id, application.id))
              .returning({ id: applications.id }),
      `Failed to save application "${application.id}".`,
    ).pipe(
      Effect.catchTag("DatabaseError", (error) =>
        Effect.gen(function* () {
          if (create && isPgErrorCode(error, "23505")) {
            return yield* new ConflictError({
              message: `Application "${application.id}" exists.`,
              cause: error,
            });
          }

          return yield* error;
        }),
      ),
    );

    if (written.length === 0) {
      if (create) {
        return yield* new ConflictError({ message: `Application "${application.id}" exists.` });
      }

      return yield* notFound(application.id);
    }

    return undefined;
  });
}

/** Creates an application (409 if the id is taken) or updates one (404 if missing). */
function saveApplication(application: Application, options: { create: boolean }): Promise<void> {
  return runServerEffect(saveApplicationEffect(application, options));
}

/**
 * Deletes an application and, with it, its cover letter. The posting it was
 * made from no longer counts as applied to.
 */
function deleteApplicationEffect(
  id: string,
): Effect.Effect<void, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const deleted = yield* dbQuery(
      (db) =>
        db.delete(applications).where(eq(applications.id, id)).returning({ id: applications.id }),
      `Failed to delete application "${id}".`,
    );

    if (deleted[0] === undefined) {
      return yield* notFound(id);
    }

    return undefined;
  });
}

/**
 * Deletes an application and, with it, its cover letter. The posting it was
 * made from no longer counts as applied to.
 */
function deleteApplication(id: string): Promise<void> {
  return runServerEffect(deleteApplicationEffect(id));
}

/** Every application's id. */
function applicationIdsEffect(): Effect.Effect<string[], DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) => db.select({ id: applications.id }).from(applications),
    "Failed to list application ids.",
  ).pipe(Effect.map((rows) => rows.map((row) => row.id)));
}

/** Every application's id. */
function applicationIds(): Promise<string[]> {
  return runServerEffect(applicationIdsEffect());
}

/** Notes the posting an application was made from. */
function linkPostingEffect(
  id: string,
  postingId: string,
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) => db.update(applications).set({ postingId }).where(eq(applications.id, id)),
    `Failed to link posting "${postingId}" to application "${id}".`,
  ).pipe(Effect.asVoid);
}

/** Notes the posting an application was made from. */
function linkPosting(id: string, postingId: string): Promise<void> {
  return runServerEffect(linkPostingEffect(id, postingId));
}

export {
  applicationIds,
  applicationIdsEffect,
  deleteApplication,
  deleteApplicationEffect,
  findApplication,
  findApplicationEffect,
  linkPosting,
  linkPostingEffect,
  listApplications,
  listApplicationsEffect,
  saveApplication,
  saveApplicationEffect,
};
