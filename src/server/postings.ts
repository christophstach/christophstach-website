import "server-only";
import type { JobPosting, JobPostingRecord, PostingEdit } from "../data/postings";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { applications, jobPostings } from "../../server/db/schema";
import type { FoundPosting } from "./collectors";
import { HttpError } from "./http";
import { createHash } from "node:crypto";
import { useDb } from "./db";

type PostingRow = typeof jobPostings.$inferSelect;

function toPosting(row: PostingRow): JobPosting {
  return {
    id: row.id,
    collectorId: row.collectorId ?? "",
    source: row.source,
    externalId: row.externalId,
    url: row.url,
    company: row.company,
    title: row.title,
    location: row.location,
    description: row.description,
    postedOn: row.postedOn,
    status: row.status,
  };
}

function notFound(id: string) {
  return new HttpError(404, `No posting "${id}".`);
}

/** The posting's slug: LinkedIn's job id, or a short hash of the page's address. */
function postingId(found: Pick<FoundPosting, "source" | "externalId">): string {
  const key = /^\d+$/u.test(found.externalId)
    ? found.externalId
    : createHash("sha256").update(found.externalId).digest("hex").slice(0, 12);

  return `${found.source}-${key}`;
}

/** All postings, newest first, each with the application made from it. */
async function listPostings(): Promise<JobPostingRecord[]> {
  const [rows, linked] = await Promise.all([
    useDb().select().from(jobPostings).orderBy(desc(jobPostings.createdAt), desc(jobPostings.id)),
    useDb()
      .select({ id: applications.id, postingId: applications.postingId })
      .from(applications)
      .where(isNotNull(applications.postingId)),
  ]);
  const applicationOf = new Map(linked.map((row) => [row.postingId, row.id]));

  return rows.map((row) =>
    Object.assign(toPosting(row), {
      applicationId: applicationOf.get(row.id) ?? "",
      createdAt: row.createdAt.toISOString(),
    }),
  );
}

async function findPosting(id: string): Promise<JobPosting | undefined> {
  const [row] = await useDb().select().from(jobPostings).where(eq(jobPostings.id, id));

  return row === undefined ? undefined : toPosting(row);
}

async function requirePosting(id: string): Promise<JobPosting> {
  const posting = await findPosting(id);

  if (posting === undefined) {
    throw notFound(id);
  }

  return posting;
}

/**
 * Stores what a collector found. A posting the desk has already (same source
 * and id) stays as it is, with its status. Answers which were new.
 */
async function addPostings(found: FoundPosting[], collectorId: string | null): Promise<string[]> {
  if (found.length === 0) {
    return [];
  }

  const added = await useDb()
    .insert(jobPostings)
    .values(found.map((posting) => ({ ...posting, id: postingId(posting), collectorId })))
    .onConflictDoNothing()
    .returning({ id: jobPostings.id });

  return added.map((row) => row.id);
}

/** Writes what the desk edits of a posting (404 if missing). */
async function savePosting(id: string, edit: PostingEdit) {
  const written = await useDb()
    .update(jobPostings)
    .set({ ...edit, updatedAt: new Date() })
    .where(eq(jobPostings.id, id))
    .returning({ id: jobPostings.id });

  if (written.length === 0) {
    throw notFound(id);
  }
}

/** Sets the status of several postings at once, e.g. dismissing a few. */
async function setPostingsStatus(ids: string[], status: JobPosting["status"]) {
  if (ids.length > 0) {
    await useDb()
      .update(jobPostings)
      .set({ status, updatedAt: new Date() })
      .where(inArray(jobPostings.id, ids));
  }
}

/** Deletes a posting; an application made from it stays and forgets it. */
async function deletePosting(id: string) {
  const deleted = await useDb()
    .delete(jobPostings)
    .where(eq(jobPostings.id, id))
    .returning({ id: jobPostings.id });

  if (deleted.length === 0) {
    throw notFound(id);
  }
}

/** Puts a posting back among the interesting ones once its application is gone. */
async function reopenPosting(id: string) {
  await useDb()
    .update(jobPostings)
    .set({ status: "interesting", updatedAt: new Date() })
    .where(and(eq(jobPostings.id, id), eq(jobPostings.status, "applied")));
}

/** A posting's stored input, for a collector to read again. */
async function postingsWithRaw(collectorId: string) {
  return useDb()
    .select({ id: jobPostings.id, externalId: jobPostings.externalId, raw: jobPostings.raw })
    .from(jobPostings)
    .where(eq(jobPostings.collectorId, collectorId));
}

/** Writes what a collector read again, keeping the desk's own edits to status. */
async function updateFound(id: string, found: FoundPosting) {
  await useDb()
    .update(jobPostings)
    .set({
      company: found.company,
      title: found.title,
      location: found.location,
      updatedAt: new Date(),
    })
    .where(eq(jobPostings.id, id));
}

export {
  addPostings,
  deletePosting,
  findPosting,
  listPostings,
  postingId,
  postingsWithRaw,
  reopenPosting,
  requirePosting,
  savePosting,
  setPostingsStatus,
  updateFound,
};
