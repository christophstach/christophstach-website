import "server-only";
import type { Collector, CollectorType } from "../data/postings";
import { addPostings, postingsWithRaw, updateFound } from "./postings";
import { asc, count, eq } from "drizzle-orm";
import { collectors, jobPostings } from "../../server/db/schema";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";
import { PUSH_COLLECTORS } from "./collectors";
import { useDb } from "./db";

// The collectors the desk is sent to: their rows, their secrets, and what
// happens when something arrives. The secret is shown once when made; the
// row keeps only its hash.

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
  }));
}

/** Makes a collector (409 if the id is taken); answers its secret, which isn't kept. */
async function createCollector(id: string, type: CollectorType, label: string): Promise<string> {
  const { secret, secretHash } = newSecret();
  const written = await useDb()
    .insert(collectors)
    .values({ id, type, label, secretHash })
    .onConflictDoNothing()
    .returning({ id: collectors.id });

  if (written.length === 0) {
    throw new HttpError(409, `Collector "${id}" exists.`);
  }

  return secret;
}

async function updateCollector(id: string, change: { label: string; active: boolean }) {
  const written = await useDb()
    .update(collectors)
    .set({ ...change, updatedAt: new Date() })
    .where(eq(collectors.id, id))
    .returning({ id: collectors.id });

  if (written.length === 0) {
    throw notFound(id);
  }
}

/** Replaces the secret; whatever sends with the old one is refused from now on. */
async function renewSecret(id: string): Promise<string> {
  const { secret, secretHash } = newSecret();
  const written = await useDb()
    .update(collectors)
    .set({ secretHash, updatedAt: new Date() })
    .where(eq(collectors.id, id))
    .returning({ id: collectors.id });

  if (written.length === 0) {
    throw notFound(id);
  }

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

  return given !== "" && timingSafeEqual(actual, expected);
}

interface CollectorRun {
  found: number;
  added: number;
}

/**
 * What a collector is sent: checks its secret, reads the body with the
 * collector's type and stores the postings. Notes the run on the collector,
 * a failed one with its reason.
 */
async function receive(id: string, request: Request): Promise<CollectorRun> {
  const [row] = await useDb().select().from(collectors).where(eq(collectors.id, id));

  // An unknown id and a wrong secret answer alike, so the endpoint gives nothing away.
  if (row === undefined || !hasSecret(request, row.secretHash)) {
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

    await useDb()
      .update(collectors)
      .set({
        lastRunAt: new Date(),
        lastFound: found.length,
        lastAdded: added.length,
        // Mails without a single job usually mean the mail's shape changed.
        lastError: found.length === 0 ? "Found no jobs in what was sent." : "",
      })
      .where(eq(collectors.id, id));

    return { found: found.length, added: added.length };
  } catch (error) {
    await useDb()
      .update(collectors)
      .set({
        lastRunAt: new Date(),
        lastFound: 0,
        lastAdded: 0,
        lastError: error instanceof HttpError ? error.message : "The run failed.",
      })
      .where(eq(collectors.id, id));

    throw error;
  }
}

/** Reads every posting a collector found again from its stored input; answers how many it read. */
async function rereadCollector(id: string): Promise<number> {
  const [row] = await useDb()
    .select({ type: collectors.type })
    .from(collectors)
    .where(eq(collectors.id, id));

  if (row === undefined) {
    throw notFound(id);
  }

  const collector = PUSH_COLLECTORS[row.type];
  const reread = (await postingsWithRaw(id)).flatMap((posting) => {
    const found = collector.reread(posting.raw, posting.externalId);

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
  updateCollector,
};
