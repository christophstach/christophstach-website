import "server-only";
import { Clock, Duration, Effect, Option } from "effect";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { jobPostings } from "../../server/db/schema";
import { ATS_PROVIDERS } from "../data/postings";
import type { AtsProvider } from "../data/postings";
import { BOARD_NAME } from "../lib/ats-board";
import { companiesByKey } from "../lib/company";
import { companyKey, titleKey } from "../lib/posting";
import { readBoardEffect } from "./collectors";
import type { FoundPosting } from "./collectors/types";
import { listCompaniesEffect } from "./companies";
import {
  type ConfigError,
  type Database,
  type DatabaseError,
  dbQuery,
  runServerEffect,
} from "./effect";

// The text of ads that came without one. LinkedIn's alert mails carry only a
// job's title, company and place, and the desk never fetches LinkedIn. Many
// companies, startups above all, post the same job on their own board at
// Greenhouse, Lever, Ashby or Personio, which the desk reads anyway: the
// board's name is guessed from the company's name and website, and a job
// with the same title lends its text. A posting is searched for once; a
// found text makes its score stale, so the model reads it.

/** Board names tried per company; each is tried at every provider. */
const MAX_NAMES = 4;

/** Parallel ATS board probes per company. */
const PROBE_CONCURRENCY = 4;

/** Parallel database writes per company. */
const WRITE_CONCURRENCY = 8;

/** A company is only started with this much time left; a board read takes a few seconds. */
const MIN_COMPANY_MS = 5000;

interface AdTextRun {
  /** Postings searched for in this run. */
  checked: number;
  /** Postings whose text was found. */
  filled: string[];
  /** Postings still to search, for the next run. */
  left: number;
}

type Waiting = Pick<
  typeof jobPostings.$inferSelect,
  "id" | "company" | "title" | "location" | "workplace"
>;

/** The first label of a website's host, e.g. "acme" for https://www.acme.io; empty if none. */
function hostName(website: string): string {
  const address = website.trim();

  if (address === "") {
    return "";
  }

  try {
    const { hostname } = new URL(address.includes("://") ? address : `https://${address}`);

    return hostname.replace(/^www\./u, "").split(".")[0] ?? "";
  } catch {
    return "";
  }
}

/**
 * The names a company's board may have: its name run together ("acmelabs"),
 * hyphenated ("acme-labs"), its first word if that is long enough to be its
 * own, and its website's name.
 */
function boardNames(company: string, website: string): string[] {
  const parts = companyKey(company)
    .split(" ")
    .filter((part) => part !== "");
  const first = parts[0] ?? "";
  const names = [
    parts.join(""),
    parts.join("-"),
    ...(parts.length > 1 && first.length >= 4 ? [first] : []),
    hostName(website).toLowerCase(),
  ];

  return [...new Set(names)]
    .filter((name) => name !== "" && BOARD_NAME.test(name))
    .slice(0, MAX_NAMES);
}

/** Whether two titles name the same job: the same words, or one nearly all of the other. */
function sameTitle(a: string, b: string): boolean {
  const one = titleKey(a);
  const other = titleKey(b);

  if (one === "" || other === "") {
    return false;
  }

  if (one === other) {
    return true;
  }

  const [shorter, longer] = one.length < other.length ? [one, other] : [other, one];

  return longer.includes(shorter) && shorter.length / longer.length >= 0.8;
}

/** Whether two places share a word, e.g. "Berlin, Germany" and "Berlin". */
function samePlace(a: string, b: string): boolean {
  const words = new Set(titleKey(a).split(" "));

  return titleKey(b)
    .split(" ")
    .some((word) => word.length > 2 && words.has(word));
}

/** The job a board lists under the posting's title, in its place where several match. */
function matchingJob(posting: Waiting, jobs: readonly FoundPosting[]): FoundPosting | undefined {
  const matches = jobs.filter(
    (job) => job.description !== "" && sameTitle(job.title, posting.title),
  );

  return matches.find((job) => samePlace(job.location, posting.location)) ?? matches[0];
}

/**
 * Every job on the boards the company may have, read with bounded concurrency.
 * A board that doesn't exist, fails, or runs past the deadline adds nothing.
 */
function boardJobsEffect(
  company: string,
  website: string,
  boardDeadline: number,
): Effect.Effect<FoundPosting[]> {
  const targets = boardNames(company, website).flatMap((board) =>
    ATS_PROVIDERS.map((provider: AtsProvider) => ({ provider, board })),
  );

  return Effect.forEach(
    targets,
    ({ provider, board }) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis;
        const remaining = boardDeadline - now;

        if (remaining <= 0) {
          return [];
        }

        const timed = yield* readBoardEffect({
          provider,
          board,
          company,
          titleIncludes: [],
          titleExcludes: [],
          locations: [],
        }).pipe(Effect.option, Effect.timeoutOption(Duration.millis(remaining)));

        return Option.isSome(timed) && Option.isSome(timed.value) ? timed.value.value : [];
      }),
    { concurrency: PROBE_CONCURRENCY },
  ).pipe(Effect.map((batches) => batches.flat()));
}

/** The postings without text whose company's boards weren't searched yet, newest first. */
function waitingPostingsEffect(
  ids: string[] | undefined,
): Effect.Effect<Waiting[], DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) =>
      db
        .select({
          id: jobPostings.id,
          company: jobPostings.company,
          title: jobPostings.title,
          location: jobPostings.location,
          workplace: jobPostings.workplace,
        })
        .from(jobPostings)
        .where(
          and(
            eq(jobPostings.description, ""),
            isNull(jobPostings.adTextCheckedAt),
            ne(jobPostings.status, "dismissed"),
            ids === undefined ? undefined : inArray(jobPostings.id, ids),
          ),
        )
        .orderBy(desc(jobPostings.createdAt), desc(jobPostings.id)),
    "Could not load postings waiting for ad text.",
  );
}

/** Stores a found text, which makes the posting's score stale, or notes that none was found. */
function storeEffect(
  posting: Waiting,
  job: FoundPosting | undefined,
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  const checked = { adTextCheckedAt: new Date() };

  return dbQuery(
    (db) =>
      db
        .update(jobPostings)
        .set(
          job === undefined
            ? checked
            : {
                ...checked,
                description: job.description,
                adTextUrl: job.url,
                // The board may say what the mail didn't.
                workplace: posting.workplace === "" ? job.workplace : posting.workplace,
                // Read again with the text.
                score: null,
                scoredAt: null,
                updatedAt: new Date(),
              },
        )
        .where(eq(jobPostings.id, posting.id)),
    "Could not save job posting ad text.",
  ).pipe(Effect.asVoid);
}

/**
 * Searches the company boards for the text of postings that have none, one
 * company at a time until the deadline: the ones waiting, or the given ones.
 */
function fillAdTextsEffect({
  deadline,
  ids,
}: {
  deadline: number;
  ids?: string[];
}): Effect.Effect<AdTextRun, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const run: AdTextRun = { checked: 0, filled: [], left: 0 };

    if (ids?.length === 0) {
      return run;
    }

    const waiting = yield* waitingPostingsEffect(ids);

    run.left = waiting.length;

    if (waiting.length === 0) {
      return run;
    }

    const byCompany = Map.groupBy(waiting, (posting) => companyKey(posting.company));
    const known = companiesByKey(yield* listCompaniesEffect());

    // One company at a time: the deadline is checked before each.
    yield* Effect.forEach(
      [...byCompany],
      ([key, postings]) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const remaining = deadline - now;

          if (remaining < MIN_COMPANY_MS) {
            return;
          }

          const [first] = postings;
          const jobs =
            key === "" || first === undefined
              ? []
              : yield* boardJobsEffect(
                  first.company,
                  known.get(key)?.website ?? "",
                  deadline - 1000,
                );

          yield* Effect.forEach(
            postings,
            (posting) =>
              Effect.gen(function* () {
                const job = matchingJob(posting, jobs);

                yield* storeEffect(posting, job);
                run.checked += 1;
                run.left -= 1;

                if (job !== undefined) {
                  run.filled.push(posting.id);
                }
              }),
            { concurrency: WRITE_CONCURRENCY, discard: true },
          );
        }),
      { concurrency: 1, discard: true },
    );

    return run;
  });
}

/** Searches without failing what called it; what wasn't searched stays waiting. */
function fillAdTextsQuietlyEffect(options: {
  deadline: number;
  ids?: string[];
}): Effect.Effect<void, never, Database> {
  return Effect.ignore(fillAdTextsEffect(options));
}

/**
 * Searches the company boards for the text of postings that have none, one
 * company at a time until the deadline: the ones waiting, or the given ones.
 */
async function fillAdTexts(options: { deadline: number; ids?: string[] }): Promise<AdTextRun> {
  return runServerEffect(fillAdTextsEffect(options));
}

/** Searches without failing what called it; what wasn't searched stays waiting. */
async function fillAdTextsQuietly(options: { deadline: number; ids?: string[] }): Promise<void> {
  return runServerEffect(fillAdTextsQuietlyEffect(options));
}

export { fillAdTexts, fillAdTextsEffect, fillAdTextsQuietly, fillAdTextsQuietlyEffect };
export type { AdTextRun };
