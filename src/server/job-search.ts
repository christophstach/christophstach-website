import "server-only";
import { jobSearch } from "../../server/db/schema";
import { sql } from "drizzle-orm";
import { useDb } from "./db";

// What the desk is looking for, in its own words: one row, the scoring
// model's brief beside the CV (src/server/posting-score.ts).

interface JobSearch {
  notes: string;
  /** ISO timestamp; empty while nothing was written. A score older than it is stale. */
  updatedAt: string;
}

async function loadJobSearch(): Promise<JobSearch> {
  const [row] = await useDb().select().from(jobSearch);

  return row === undefined
    ? { notes: "", updatedAt: "" }
    : { notes: row.notes, updatedAt: row.updatedAt.toISOString() };
}

async function saveJobSearch(notes: string) {
  await useDb()
    .insert(jobSearch)
    .values({ id: 1, notes })
    .onConflictDoUpdate({ target: jobSearch.id, set: { notes, updatedAt: sql`now()` } });
}

export { loadJobSearch, saveJobSearch };
export type { JobSearch };
