import "server-only";
import type { AtsBoard, Collector, CollectorType } from "../data/postings";
import {
  PUSH_COLLECTORS,
  atsBoardSchema,
  matchesBoard,
  readBoard,
  rereadBoardJob,
} from "./collectors";
import { addPostings, dismissClosed, postingsWithRaw, updateFound } from "./postings";
import { and, asc, count, eq, isNull, lt, or } from "drizzle-orm";
import { collectors, jobPostings } from "../../server/db/schema";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";
import { checkCompaniesQuietly } from "./company-check";
import { isPullCollector } from "../data/postings";
import { safeParse } from "zod/mini";
import { useDb } from "./db";

// The collectors: their rows, their secrets, and their runs. One the desk is
// sent to has a secret, shown once when made; the row keeps only its hash.
// One the desk runs itself (a company's job board) has none, and runs from
// the scheduled job every few hours, or from "Run now".

/** How long a job board rests between two scheduled runs. */
const BOARD_INTERVAL_MS = 6 * 60 * 60 * 1000;

type CollectorRow = typeof collectors.$inferSelect;

function notFound(id: string) {
  return new HttpError(404, `No collector "${id}".`);
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
  const parsed = safeParse(atsBoardSchema, row.board);

  return parsed.success ? parsed.data : null;
}

async function requireRow(id: string): Promise<CollectorRow> {
  const [row] = await useDb().select().from(collectors).where(eq(collectors.id, id));

  if (row === undefined) {
    throw notFound(id);
  }

  return row;
}

/** All collectors, oldest first, each with how many postings it found. */
async function listCollectors(): Promise<Collector[]> {
  const [rows, counts] = await Promise.all([
    useDb().select().from(collectors).orderBy(asc(collectors.createdAt), asc(collectors.id)),
    useDb()
      .select({ collectorId: jobPostings.collectorId, postings: count() })
      .from(jobPostings)
      .groupBy(jobPostings.collectorId),
  ]);
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
  const pull = isPullCollector(type);

  if (pull && board === null) {
    throw new HttpError(400, "A job board collector needs its board.");
  }

  const { secret, secretHash } = pull ? { secret: "", secretHash: null } : newSecret();
  const written = await useDb()
    .insert(collectors)
    .values({ id, type, label, secretHash, board: pull ? board : null })
    .onConflictDoNothing()
    .returning({ id: collectors.id });

  if (written.length === 0) {
    throw new HttpError(409, `Collector "${id}" exists.`);
  }

  return secret;
}

/** Writes a collector's name and state, and the board of one that reads a board. */
async function updateCollector(
  id: string,
  change: { label: string; active: boolean; board?: AtsBoard },
) {
  const row = await requireRow(id);
  const { board, ...rest } = change;

  if (board !== undefined && !isPullCollector(row.type)) {
    throw new HttpError(400, "Only a job board collector has a board.");
  }

  await useDb()
    .update(collectors)
    .set({ ...rest, ...(board === undefined ? {} : { board }), updatedAt: new Date() })
    .where(eq(collectors.id, id));
}

/** Replaces the secret; whatever sends with the old one is refused from now on. */
async function renewSecret(id: string): Promise<string> {
  const row = await requireRow(id);

  if (isPullCollector(row.type)) {
    throw new HttpError(400, "The desk runs this collector itself: it has no secret.");
  }

  const { secret, secretHash } = newSecret();

  await useDb()
    .update(collectors)
    .set({ secretHash, updatedAt: new Date() })
    .where(eq(collectors.id, id));

  return secret;
}

/** Deletes a collector; the postings it found stay, as if added by hand. */
async function deleteCollector(id: string) {
  const deleted = await useDb()
    .delete(collectors)
    .where(eq(collectors.id, id))
    .returning({ id: collectors.id });

  if (deleted.length === 0) {
    throw notFound(id);
  }
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
async function noteRun(id: string, run: { found: number; added: number; error: string }) {
  await useDb()
    .update(collectors)
    .set({
      lastRunAt: new Date(),
      lastFound: run.found,
      lastAdded: run.added,
      lastError: run.error,
    })
    .where(eq(collectors.id, id));
}

/**
 * What a collector is sent: checks its secret, reads the body with the
 * collector's type and stores the postings. Notes the run on the collector,
 * a failed one with its reason.
 */
async function receive(id: string, request: Request): Promise<CollectorRun> {
  const [row] = await useDb().select().from(collectors).where(eq(collectors.id, id));

  // An unknown id, one nothing sends to and a wrong secret answer alike, so
  // the endpoint gives nothing away.
  if (
    row === undefined ||
    isPullCollector(row.type) ||
    row.secretHash === null ||
    !hasSecret(request, row.secretHash)
  ) {
    throw new HttpError(401, "Unauthorized.");
  }

  if (!row.active) {
    throw new HttpError(409, `Collector "${id}" is paused.`);
  }

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "The body is no JSON.");
    }

    const found = PUSH_COLLECTORS[row.type].read(body);
    const added = await addPostings(found, id);

    // Describes the companies of new postings; a source that fails never fails the run.
    await checkCompaniesQuietly({ deadline: Date.now() + 20_000 });
    // Mails without a single job usually mean the mail's shape changed.
    await noteRun(id, {
      found: found.length,
      added: added.length,
      error: found.length === 0 ? "Found no jobs in what was sent." : "",
    });

    return { found: found.length, added: added.length, closed: 0 };
  } catch (error) {
    await noteRun(id, {
      found: 0,
      added: 0,
      error: error instanceof HttpError ? error.message : "The run failed.",
    });

    throw error;
  }
}

/**
 * Reads a job board collector's board: stores the jobs that pass its
 * filters and dismisses new postings of jobs the board no longer lists.
 * Notes the run on the collector, a failed one with its reason. Leaves the
 * companies to the caller.
 */
async function runBoard(row: CollectorRow): Promise<CollectorRun> {
  const board = boardOf(row);

  try {
    if (board === null) {
      throw new HttpError(400, "The collector has no board.");
    }

    const listed = await readBoard(board);
    const found = listed.filter((posting) => matchesBoard(posting, board));
    const added = await addPostings(found, row.id);
    const closed = await dismissClosed(
      row.id,
      listed.map((posting) => posting.externalId),
    );

    await noteRun(row.id, {
      found: found.length,
      added: added.length,
      // A board without a single job most likely moved or was renamed.
      error: listed.length === 0 ? "The board lists no jobs." : "",
    });

    return { found: found.length, added: added.length, closed };
  } catch (error) {
    await noteRun(row.id, {
      found: 0,
      added: 0,
      error: error instanceof HttpError ? error.message : "The run failed.",
    });

    throw error;
  }
}

/** Runs a collector the desk runs itself, now ("Run now"), also a paused one. */
async function runCollector(id: string): Promise<CollectorRun> {
  const row = await requireRow(id);

  if (!isPullCollector(row.type)) {
    throw new HttpError(400, "This collector is sent to: it doesn't run on its own.");
  }

  const run = await runBoard(row);

  await checkCompaniesQuietly({ deadline: Date.now() + 15_000 });

  return run;
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
async function runDueCollectors({ deadline }: { deadline: number }): Promise<DueRun> {
  const due = await useDb()
    .select()
    .from(collectors)
    .where(
      and(
        eq(collectors.type, "ats-board"),
        eq(collectors.active, true),
        or(
          isNull(collectors.lastRunAt),
          lt(collectors.lastRunAt, new Date(Date.now() - BOARD_INTERVAL_MS)),
        ),
      ),
    )
    .orderBy(asc(collectors.lastRunAt));
  const result: DueRun = { ran: [], failed: [], left: [] };

  async function runOne(row: CollectorRow) {
    if (Date.now() > deadline) {
      result.left.push(row.id);

      return;
    }

    try {
      const run = await runBoard(row);

      result.ran.push(`${row.id}: ${run.found} found, ${run.added} new, ${run.closed} closed`);
    } catch (error) {
      result.failed.push({
        name: row.id,
        error: error instanceof HttpError ? error.message : "The run failed.",
      });
    }
  }

  // One at a time on purpose: the deadline is checked before each board.
  await due.reduce<Promise<void>>(
    (previous, row) => previous.then(() => runOne(row)),
    Promise.resolve(),
  );

  return result;
}

/** Reads every posting a collector found again from its stored input; answers how many it read. */
async function rereadCollector(id: string): Promise<number> {
  const row = await requireRow(id);
  const board = boardOf(row);
  const reread = (await postingsWithRaw(id)).flatMap((posting) => {
    const found = isPullCollector(row.type)
      ? board === null
        ? undefined
        : rereadBoardJob(posting.raw, board)
      : PUSH_COLLECTORS[row.type].reread(posting.raw, posting.externalId);

    return found === undefined ? [] : [{ id: posting.id, found }];
  });

  await Promise.all(reread.map(({ id: postingId, found }) => updateFound(postingId, found)));

  return reread.length;
}

export {
  createCollector,
  deleteCollector,
  listCollectors,
  receive,
  renewSecret,
  rereadCollector,
  runCollector,
  runDueCollectors,
  updateCollector,
};
export type { CollectorRun, DueRun };
