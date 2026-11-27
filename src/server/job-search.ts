import "server-only";
import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { jobSearch } from "../../server/db/schema";
import { type Database, dbQuery } from "./effect/db";
import type { ConfigError, DatabaseError } from "./effect/errors";
import { runServerEffect } from "./effect/runtime";

// What the desk is looking for, in its own words: one row, the scoring
// model's brief beside the CV (src/server/posting-score.ts).

interface JobSearch {
  notes: string;
  /** ISO timestamp; empty while nothing was written. A score older than it is stale. */
  updatedAt: string;
}

function loadJobSearchEffect(): Effect.Effect<JobSearch, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) => db.select().from(jobSearch),
      "Could not load job search notes.",
    );

    return row === undefined
      ? { notes: "", updatedAt: "" }
      : { notes: row.notes, updatedAt: row.updatedAt.toISOString() };
  });
}

function saveJobSearchEffect(
  notes: string,
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) =>
      db
        .insert(jobSearch)
        .values({ id: 1, notes })
        .onConflictDoUpdate({ target: jobSearch.id, set: { notes, updatedAt: sql`now()` } }),
    "Could not save job search notes.",
  ).pipe(Effect.asVoid);
}

async function loadJobSearch(): Promise<JobSearch> {
  return runServerEffect(loadJobSearchEffect());
}

async function saveJobSearch(notes: string): Promise<void> {
  return runServerEffect(saveJobSearchEffect(notes));
}

export { loadJobSearch, loadJobSearchEffect, saveJobSearch, saveJobSearchEffect };
export type { JobSearch };
