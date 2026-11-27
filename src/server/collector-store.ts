import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Clock, Effect, Option, Result } from "effect";
import { and, asc, count, eq, isNull, lt, or } from "drizzle-orm";
import { collectors, jobPostings } from "../../server/db/schema";
import { isPullCollector } from "../data/postings";
import type { AtsBoard, Collector, CollectorType } from "../data/postings";
import {
  PUSH_COLLECTORS,
  decodeAtsBoardOption,
  matchesBoard,
  readBoardEffect,
  rereadBoardJob,
} from "./collectors";
import { checkCompaniesQuietlyEffect } from "./company-check";
import {
  AiScoringError,
  type AppError,
  BadRequestError,
  type ConfigError,
  ConflictError,
  type Database,
  type DatabaseError,
  type ExternalFetchError,
  NotFoundError,
  UnauthorizedError,
  dbQuery,
  dbTransaction,
  isPgErrorCode,
  runServerEffect,
} from "./effect";
import { readJsonEffect } from "./input";
import { scoreSoon } from "./posting-score";
import {
  addPostingsEffect,
  dismissClosedEffect,
  postingsWithRawEffect,
  updateFoundEffect,
} from "./postings";

// The collectors: their rows, their secrets, and their runs. One the desk is
// sent to has a secret, shown once when made; the row keeps only its hash.
// One the desk runs itself (a company's job board) has none, and runs from
// the scheduled job every few hours, or from "Run now".

/** How long a job board rests between two scheduled runs. */
const BOARD_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Parallel database writes when rereading a collector's stored postings. */
const REREAD_CONCURRENCY = 8;

type CollectorRow = typeof collectors.$inferSelect;

type UpdateCollectorOutcome =
  | { readonly _tag: "updated" }
  | { readonly _tag: "notFound" }
  | { readonly _tag: "invalidBoard" };

type RenewSecretOutcome =
  | { readonly _tag: "renewed"; readonly secret: string }
  | { readonly _tag: "notFound" }
  | { readonly _tag: "pullCollector" };

function notFound(id: string): NotFoundError {
  return new NotFoundError({ message: `No collector "${id}".` });
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function newSecret(): { secret: string; secretHash: string } {
  const secret = randomBytes(32).toString("base64url");

  return { secret, secretHash: hashSecret(secret) };
}

/** The stored board, read through its schema: the row is jsonb. */
function boardOf(row: Pick<CollectorRow, "board">): AtsBoard | null {
  return Option.getOrNull(decodeAtsBoardOption(row.board));
}

function runErrorMessage(error: AppError): string {
  if (error._tag === "DatabaseError" || error._tag === "ConfigError") {
    return "The run failed.";
  }

  return error.message;
}

function scoreSoonEffect(
  ids: string[],
  options: { started: number; request?: Request },
): Effect.Effect<void, AiScoringError> {
  return Effect.tryPromise({
    try: () => scoreSoon(ids, options),
    catch: (cause) => new AiScoringError({ message: "Scoring failed.", cause }),
  });
}

function requireRowEffect(
  id: string,
): Effect.Effect<CollectorRow, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) => db.select().from(collectors).where(eq(collectors.id, id)),
      "Could not load collector.",
    );

    if (row === undefined) {
      return yield* notFound(id);
    }

    return row;
  });
}

/** All collectors, oldest first, each with how many postings it found. */
function listCollectorsEffect(): Effect.Effect<Collector[], DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [rows, counts] = yield* Effect.all(
      [
        dbQuery(
          (db) =>
            db.select().from(collectors).orderBy(asc(collectors.createdAt), asc(collectors.id)),
          "Could not list collectors.",
        ),
        dbQuery(
          (db) =>
            db
              .select({ collectorId: jobPostings.collectorId, postings: count() })
              .from(jobPostings)
              .groupBy(jobPostings.collectorId),
          "Could not count collector postings.",
        ),
      ],
      { concurrency: "unbounded" },
    );
    const postingsOf = new Map(counts.map((row) => [row.collectorId, row.postings]));

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      label: row.label,
      active: row.active,
      lastRunAt: row.lastRunAt?.toISOString() ?? "",
      lastFound: row.lastFound,
      lastAdded: row.lastAdded,
      lastError: row.lastError,
      postings: postingsOf.get(row.id) ?? 0,
      board: boardOf(row),
    }));
  });
}

/**
 * Makes a collector (409 if the id is taken). Answers its secret, which isn't
 * kept; one the desk runs itself has none, and answers "".
 */
function createCollectorEffect(
  id: string,
  type: CollectorType,
  label: string,
  board: AtsBoard | null,
): Effect.Effect<string, BadRequestError | ConflictError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const pull = isPullCollector(type);

    if (pull && board === null) {
      return yield* new BadRequestError({ message: "A job board collector needs its board." });
    }

    const { secret, secretHash } = pull ? { secret: "", secretHash: null } : newSecret();
    const written = yield* dbQuery(
      (db) =>
        db
          .insert(collectors)
          .values({ id, type, label, secretHash, board: pull ? board : null })
          .onConflictDoNothing()
          .returning({ id: collectors.id }),
      "Could not create collector.",
    ).pipe(
      Effect.catchTag(
        "DatabaseError",
        (error): Effect.Effect<never, ConflictError | DatabaseError> =>
          isPgErrorCode(error, "23505")
            ? new ConflictError({ message: `Collector "${id}" exists.`, cause: error })
            : error,
      ),
    );

    if (written.length === 0) {
      return yield* new ConflictError({ message: `Collector "${id}" exists.` });
    }

    return secret;
  });
}

/** Writes a collector's name and state, and the board of one that reads a board. */
function updateCollectorEffect(
  id: string,
  change: { label: string; active: boolean; board?: AtsBoard },
): Effect.Effect<void, NotFoundError | BadRequestError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const { board, ...rest } = change;
    const outcome = yield* dbTransaction<UpdateCollectorOutcome>(async (tx) => {
      const [row] = await tx.select().from(collectors).where(eq(collectors.id, id));

      if (row === undefined) {
        return { _tag: "notFound" };
      }

      if (board !== undefined && !isPullCollector(row.type)) {
        return { _tag: "invalidBoard" };
      }

      await tx
        .update(collectors)
        .set({ ...rest, ...(board === undefined ? {} : { board }), updatedAt: new Date() })
        .where(eq(collectors.id, id));

      return { _tag: "updated" };
    }, "Could not update collector.");

    if (outcome._tag === "notFound") {
      return yield* notFound(id);
    }

    if (outcome._tag === "invalidBoard") {
      return yield* new BadRequestError({ message: "Only a job board collector has a board." });
    }

    return undefined;
  });
}

/** Replaces the secret; whatever sends with the old one is refused from now on. */
function renewSecretEffect(
  id: string,
): Effect.Effect<string, NotFoundError | BadRequestError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const outcome = yield* dbTransaction<RenewSecretOutcome>(async (tx) => {
      const [row] = await tx.select().from(collectors).where(eq(collectors.id, id));

      if (row === undefined) {
        return { _tag: "notFound" };
      }

      if (isPullCollector(row.type)) {
        return { _tag: "pullCollector" };
      }

      const { secret, secretHash } = newSecret();

      await tx
        .update(collectors)
        .set({ secretHash, updatedAt: new Date() })
        .where(eq(collectors.id, id));

      return { _tag: "renewed", secret };
    }, "Could not renew collector secret.");

    if (outcome._tag === "notFound") {
      return yield* notFound(id);
    }

    if (outcome._tag === "pullCollector") {
      return yield* new BadRequestError({
        message: "The desk runs this collector itself: it has no secret.",
      });
    }

    return outcome.secret;
  });
}

/** Deletes a collector; the postings it found stay, as if added by hand. */
function deleteCollectorEffect(
  id: string,
): Effect.Effect<void, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const deleted = yield* dbQuery(
      (db) => db.delete(collectors).where(eq(collectors.id, id)).returning({ id: collectors.id }),
      "Could not delete collector.",
    );

    if (deleted.length === 0) {
      return yield* notFound(id);
    }

    return undefined;
  });
}

/** Whether the request carries the collector's secret as `Authorization: Bearer <secret>`. */
function hasSecret(request: Request, secretHash: string): boolean {
  const given = /^Bearer (.+)$/u.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  const expected = Buffer.from(secretHash, "hex");
  const actual = Buffer.from(hashSecret(given), "hex");

  return given !== "" && actual.length === expected.length && timingSafeEqual(actual, expected);
}

interface CollectorRun {
  found: number;
  added: number;
  /** New postings dismissed because their board no longer lists them. */
  closed: number;
}

/** Notes a run on the collector: what it found, or why it failed. */
function noteRunEffect(
  id: string,
  run: { found: number; added: number; error: string },
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) =>
      db
        .update(collectors)
        .set({
          lastRunAt: new Date(),
          lastFound: run.found,
          lastAdded: run.added,
          lastError: run.error,
        })
        .where(eq(collectors.id, id)),
    "Could not record collector run.",
  ).pipe(Effect.asVoid);
}

/**
 * What a collector is sent: checks its secret, reads the body with the
 * collector's type and stores the postings. Notes the run on the collector,
 * a failed one with its reason.
 */
function receiveEffect(
  id: string,
  request: Request,
): Effect.Effect<
  CollectorRun,
  | UnauthorizedError
  | ConflictError
  | BadRequestError
  | AiScoringError
  | DatabaseError
  | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const [row] = yield* dbQuery(
      (db) => db.select().from(collectors).where(eq(collectors.id, id)),
      "Could not load collector.",
    );

    // An unknown id, one nothing sends to and a wrong secret answer alike, so
    // the endpoint gives nothing away.
    if (
      row === undefined ||
      isPullCollector(row.type) ||
      row.secretHash === null ||
      !hasSecret(request, row.secretHash)
    ) {
      return yield* new UnauthorizedError({ message: "Unauthorized." });
    }

    if (!row.active) {
      return yield* new ConflictError({ message: `Collector "${id}" is paused.` });
    }

    const collectorType = row.type;

    return yield* Effect.gen(function* () {
      const body = yield* readJsonEffect(request);
      const found = yield* PUSH_COLLECTORS[collectorType].readEffect(body);
      const added = yield* addPostingsEffect(found, id);
      const now = yield* Clock.currentTimeMillis;

      // Describes the companies of new postings; a source that fails never fails the run.
      yield* checkCompaniesQuietlyEffect({ deadline: now + 20_000 });
      // Mails without a single job usually mean the mail's shape changed.
      yield* noteRunEffect(id, {
        found: found.length,
        added: added.length,
        error: found.length === 0 ? "Found no jobs in what was sent." : "",
      });
      // Then scores them, after the response where the platform allows it.
      yield* scoreSoonEffect(added, { started, request });

      return { found: found.length, added: added.length, closed: 0 };
    }).pipe(
      Effect.tapError((error) =>
        noteRunEffect(id, {
          found: 0,
          added: 0,
          error: runErrorMessage(error),
        }).pipe(Effect.ignore),
      ),
    );
  });
}

/**
 * Reads a job board collector's board: stores the jobs that pass its
 * filters and dismisses new postings of jobs the board no longer lists.
 * Notes the run on the collector, a failed one with its reason. Leaves the
 * companies and scores to the caller; answers the new postings' ids too.
 */
function runBoardEffect(
  row: CollectorRow,
): Effect.Effect<
  { run: CollectorRun; added: string[] },
  BadRequestError | NotFoundError | ExternalFetchError | DatabaseError | ConfigError,
  Database
> {
  const board = boardOf(row);

  return Effect.gen(function* () {
    if (board === null) {
      return yield* new BadRequestError({ message: "The collector has no board." });
    }

    const listed = yield* readBoardEffect(board);
    const found = listed.filter((posting) => matchesBoard(posting, board));
    const added = yield* addPostingsEffect(found, row.id);
    const closed = yield* dismissClosedEffect(
      row.id,
      listed.map((posting) => posting.externalId),
    );

    yield* noteRunEffect(row.id, {
      found: found.length,
      added: added.length,
      // A board without a single job most likely moved or was renamed.
      error: listed.length === 0 ? "The board lists no jobs." : "",
    });

    return { run: { found: found.length, added: added.length, closed }, added };
  }).pipe(
    Effect.tapError((error) =>
      noteRunEffect(row.id, {
        found: 0,
        added: 0,
        error: runErrorMessage(error),
      }).pipe(Effect.ignore),
    ),
  );
}

/** Runs a collector the desk runs itself, now ("Run now"), also a paused one. */
function runCollectorEffect(
  id: string,
): Effect.Effect<
  CollectorRun,
  | NotFoundError
  | BadRequestError
  | ExternalFetchError
  | AiScoringError
  | DatabaseError
  | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const row = yield* requireRowEffect(id);

    if (!isPullCollector(row.type)) {
      return yield* new BadRequestError({
        message: "This collector is sent to: it doesn't run on its own.",
      });
    }

    const { run, added } = yield* runBoardEffect(row);
    const now = yield* Clock.currentTimeMillis;

    yield* checkCompaniesQuietlyEffect({ deadline: now + 15_000 });
    yield* scoreSoonEffect(added, { started });

    return run;
  });
}

interface DueRun {
  /** e.g. "acme-jobs: 3 found, 1 new, 0 closed". */
  ran: string[];
  failed: { name: string; error: string }[];
  /** Out of time; the next run takes them. */
  left: string[];
}

/**
 * Runs every active job board collector whose last run is older than
 * BOARD_INTERVAL_MS, one at a time, until the deadline. For the scheduled
 * job, which describes the new postings' companies after.
 */
function runDueCollectorsEffect({
  deadline,
}: {
  deadline: number;
}): Effect.Effect<DueRun, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const due = yield* dbQuery(
      (db) =>
        db
          .select()
          .from(collectors)
          .where(
            and(
              eq(collectors.type, "ats-board"),
              eq(collectors.active, true),
              or(
                isNull(collectors.lastRunAt),
                lt(collectors.lastRunAt, new Date(now - BOARD_INTERVAL_MS)),
              ),
            ),
          )
          .orderBy(asc(collectors.lastRunAt)),
      "Could not list due collectors.",
    );
    const result: DueRun = { ran: [], failed: [], left: [] };

    // One at a time on purpose: the deadline is checked before each board.
    yield* Effect.forEach(
      due,
      (row) =>
        Effect.gen(function* () {
          const current = yield* Clock.currentTimeMillis;

          if (current > deadline) {
            result.left.push(row.id);

            return;
          }

          const outcome = yield* Effect.result(runBoardEffect(row));

          if (Result.isSuccess(outcome)) {
            const { run } = outcome.success;

            result.ran.push(
              `${row.id}: ${run.found} found, ${run.added} new, ${run.closed} closed`,
            );
          } else {
            result.failed.push({
              name: row.id,
              error: runErrorMessage(outcome.failure),
            });
          }
        }),
      { concurrency: 1, discard: true },
    );

    return result;
  });
}

/** Reads every posting a collector found again from its stored input; answers how many it read. */
function rereadCollectorEffect(
  id: string,
): Effect.Effect<number, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const row = yield* requireRowEffect(id);
    const board = boardOf(row);
    const stored = yield* postingsWithRawEffect(id);
    const reread = stored.flatMap((posting) => {
      const found = isPullCollector(row.type)
        ? board === null
          ? undefined
          : rereadBoardJob(posting.raw, board)
        : PUSH_COLLECTORS[row.type].reread(posting.raw, posting.externalId);

      return found === undefined ? [] : [{ id: posting.id, found }];
    });

    yield* Effect.forEach(
      reread,
      ({ id: postingId, found }) => updateFoundEffect(postingId, found),
      { concurrency: REREAD_CONCURRENCY, discard: true },
    );

    return reread.length;
  });
}

/** All collectors, oldest first, each with how many postings it found. */
async function listCollectors(): Promise<Collector[]> {
  return runServerEffect(listCollectorsEffect());
}

/**
 * Makes a collector (409 if the id is taken). Answers its secret, which isn't
 * kept; one the desk runs itself has none, and answers "".
 */
async function createCollector(
  id: string,
  type: CollectorType,
  label: string,
  board: AtsBoard | null,
): Promise<string> {
  return runServerEffect(createCollectorEffect(id, type, label, board));
}

/** Writes a collector's name and state, and the board of one that reads a board. */
async function updateCollector(
  id: string,
  change: { label: string; active: boolean; board?: AtsBoard },
): Promise<void> {
  return runServerEffect(updateCollectorEffect(id, change));
}

/** Replaces the secret; whatever sends with the old one is refused from now on. */
async function renewSecret(id: string): Promise<string> {
  return runServerEffect(renewSecretEffect(id));
}

/** Deletes a collector; the postings it found stay, as if added by hand. */
async function deleteCollector(id: string): Promise<void> {
  return runServerEffect(deleteCollectorEffect(id));
}

/**
 * What a collector is sent: checks its secret, reads the body with the
 * collector's type and stores the postings. Notes the run on the collector,
 * a failed one with its reason.
 */
async function receive(id: string, request: Request): Promise<CollectorRun> {
  return runServerEffect(receiveEffect(id, request));
}

/** Runs a collector the desk runs itself, now ("Run now"), also a paused one. */
async function runCollector(id: string): Promise<CollectorRun> {
  return runServerEffect(runCollectorEffect(id));
}

/**
 * Runs every active job board collector whose last run is older than
 * BOARD_INTERVAL_MS, one at a time, until the deadline. For the scheduled
 * job, which describes the new postings' companies after.
 */
async function runDueCollectors(options: { deadline: number }): Promise<DueRun> {
  return runServerEffect(runDueCollectorsEffect(options));
}

/** Reads every posting a collector found again from its stored input; answers how many it read. */
async function rereadCollector(id: string): Promise<number> {
  return runServerEffect(rereadCollectorEffect(id));
}

export {
  createCollector,
  createCollectorEffect,
  deleteCollector,
  deleteCollectorEffect,
  listCollectors,
  listCollectorsEffect,
  receive,
  receiveEffect,
  renewSecret,
  renewSecretEffect,
  rereadCollector,
  rereadCollectorEffect,
  runCollector,
  runCollectorEffect,
  runDueCollectors,
  runDueCollectorsEffect,
  updateCollector,
  updateCollectorEffect,
};
export type { CollectorRun, DueRun };
