import "server-only";
import type { JobPosting, JobPostingRecord, PostingEdit } from "../data/postings";
import { and, desc, eq, inArray, isNotNull, notInArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { SALARY_CURRENCIES } from "../data/postings";
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
    adTextUrl: row.adTextUrl,
    adTextCheckedAt: row.adTextCheckedAt?.toISOString() ?? "",
    postedOn: row.postedOn,
    workplace: row.workplace,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: SALARY_CURRENCIES.find((code) => code === row.salaryCurrency) ?? "",
    status: row.status,
    score:
      row.score === null || row.scoredAt === null
        ? null
        : {
            score: row.score,
            reasons: row.scoreReasons,
            concerns: row.scoreConcerns,
            cvId: row.scoreCvId,
            model: row.scoreModel,
            scoredAt: row.scoredAt.toISOString(),
          },
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
      .select({
        id: applications.id,
        status: applications.status,
        postingId: applications.postingId,
      })
      .from(applications)
      .where(isNotNull(applications.postingId)),
  ]);
  const applicationOf = new Map(linked.map((row) => [row.postingId, row]));

  return rows.map((row): JobPostingRecord => {
    const application = applicationOf.get(row.id);
    const linkedTo: Pick<JobPostingRecord, "applicationId" | "applicationStatus"> =
      application === undefined
        ? { applicationId: "", applicationStatus: "" }
        : { applicationId: application.id, applicationStatus: application.status };

    return Object.assign(toPosting(row), linkedTo, { createdAt: row.createdAt.toISOString() });
  });
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

/** A text column that keeps its value, or takes the new read's if it is empty. */
function fillEmpty(column: AnyPgColumn, name: string) {
  return sql`coalesce(nullif(${column}, ''), excluded.${sql.identifier(name)})`;
}

/**
 * The earlier of two ISO days, either may be empty. A job in several alerts
 * was posted by the first; Gmail sends the newest mails first.
 */
function earliestDay(stored: AnyPgColumn, read: SQL) {
  return sql`coalesce(least(nullif(${stored}, ''), nullif(${read}, '')), '')`;
}

/** A salary column that takes the new read's only while no salary is stored. */
function fillSalary(column: AnyPgColumn, name: string) {
  return sql`case when ${jobPostings.salaryMin} is null and ${jobPostings.salaryMax} is null
    then excluded.${sql.identifier(name)} else ${column} end`;
}

/**
 * Stores what a collector found. A posting the desk has already (same source
 * and id) keeps its status and edits, and only fills what it lacks: an older
 * read may have had no workplace or salary. Answers which were new.
 */
async function addPostings(found: FoundPosting[], collectorId: string | null): Promise<string[]> {
  // One insert can't touch a row twice: a job in two mails of one request counts once.
  const byId = new Map(found.map((posting) => [postingId(posting), posting]));
  const values = Array.from(byId, ([id, posting]) =>
    Object.assign({}, posting, { id, collectorId }),
  );

  if (values.length === 0) {
    return [];
  }

  const rows = await useDb()
    .insert(jobPostings)
    .values(values)
    .onConflictDoUpdate({
      target: [jobPostings.source, jobPostings.externalId],
      set: {
        title: fillEmpty(jobPostings.title, "title"),
        company: fillEmpty(jobPostings.company, "company"),
        location: fillEmpty(jobPostings.location, "location"),
        workplace: fillEmpty(jobPostings.workplace, "workplace"),
        postedOn: earliestDay(jobPostings.postedOn, sql`excluded.posted_on`),
        salaryMin: fillSalary(jobPostings.salaryMin, "salary_min"),
        salaryMax: fillSalary(jobPostings.salaryMax, "salary_max"),
        salaryCurrency: fillSalary(jobPostings.salaryCurrency, "salary_currency"),
        // The newest read, to read again later: a reader only gets better
        // (e.g. a mail now sent with its HTML body).
        raw: sql`coalesce(nullif(excluded.raw, ''), ${jobPostings.raw})`,
      },
    })
    // xmax is 0 for a row the insert made, not for one it updated.
    .returning({ id: jobPostings.id, added: sql<boolean>`(xmax = 0)` });

  return rows.filter((row) => row.added).map((row) => row.id);
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

/**
 * Dismisses a collector's new postings that its source no longer lists: a
 * job board lists every open job, so a job missing from it was closed.
 * Favourites stay, and so does a posting an application was made from.
 * Answers how many it dismissed. An empty list closes nothing: a board that
 * suddenly lists no job more likely broke than closed them all.
 */
async function dismissClosed(collectorId: string, openExternalIds: string[]): Promise<number> {
  if (openExternalIds.length === 0) {
    return 0;
  }

  const applied = useDb()
    .select({ postingId: applications.postingId })
    .from(applications)
    .where(isNotNull(applications.postingId));
  const closed = await useDb()
    .update(jobPostings)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(
      and(
        eq(jobPostings.collectorId, collectorId),
        eq(jobPostings.status, "new"),
        notInArray(jobPostings.externalId, openExternalIds),
        notInArray(jobPostings.id, applied),
      ),
    )
    .returning({ id: jobPostings.id });

  return closed.length;
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
      // What the input doesn't state stays: a mail kept without its HTML body
      // has no workplace or salary, which needn't mean the ad has none.
      ...(found.workplace === "" ? {} : { workplace: found.workplace }),
      ...(found.postedOn === ""
        ? {}
        : { postedOn: earliestDay(jobPostings.postedOn, sql`${found.postedOn}`) }),
      ...(found.salaryMin === null && found.salaryMax === null
        ? {}
        : {
            salaryMin: found.salaryMin,
            salaryMax: found.salaryMax,
            salaryCurrency: found.salaryCurrency,
          }),
      updatedAt: new Date(),
    })
    .where(eq(jobPostings.id, id));
}

export {
  addPostings,
  deletePosting,
  dismissClosed,
  findPosting,
  listPostings,
  postingId,
  postingsWithRaw,
  requirePosting,
  savePosting,
  setPostingsStatus,
  updateFound,
};
