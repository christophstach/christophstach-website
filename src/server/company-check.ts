import "server-only";
import { Clock, Effect, Result } from "effect";
import type { CompanyRecord, CompanySource } from "../data/companies";
import type { JobPostingRecord } from "../data/postings";
import { slugify } from "../lib/cover-letter";
import { companyKey } from "../lib/posting";
import {
  type FoundFacts,
  createCompanyEffect,
  listCompaniesEffect,
  storeFactsEffect,
} from "./companies";
import { adFacts } from "./company-facts/ad-text";
import { type WikidataFacts, wikidataFactsEffect } from "./company-facts/wikidata";
import { type YcFacts, loadYcListEffect } from "./company-facts/yc";
import { type ConfigError, type Database, type DatabaseError, runServerEffect } from "./effect";
import { listPostingsEffect } from "./postings";

// Describes the postings' companies on its own, from free sources: the Y
// Combinator list, Wikidata and the ads' own text. Every company a posting
// names gets a row; a row is checked once, and again after a month. What the
// sources find only fills empty fields, so whatever was typed stays.

/** A company is checked again after this long: batches, owners and websites change. */
const RECHECK_MS = 30 * 24 * 60 * 60 * 1000;

/** At most this many companies a run; the next run takes the rest. */
const MAX_PER_RUN = 40;

/** Parallel database writes per company-check batch. */
const WRITE_CONCURRENCY = 8;

interface CompanyCheckRun {
  /** Company ids checked in this run. */
  checked: string[];
  /** Due, but out of time or over the limit; the next run takes them. */
  left: number;
  failed: string[];
}

interface CheckOptions {
  /** Starts no further lookup after this time (ms since the epoch). */
  deadline: number;
  /** Only these companies (by companyKey); all due ones if unset. */
  keys?: ReadonlySet<string>;
  /** Checks them even if they were checked lately. */
  force?: boolean;
}

/** Adds a company for every name the postings give that has none yet. */
function addMissingEffect(
  postings: readonly JobPostingRecord[],
  stored: readonly CompanyRecord[],
): Effect.Effect<boolean, DatabaseError | ConfigError, Database> {
  const known = new Set(stored.map((company) => companyKey(company.name)));
  const taken = new Set(stored.map((company) => company.id));
  const missing = new Map<string, string>();

  for (const posting of postings) {
    const key = companyKey(posting.company);

    if (key !== "" && !known.has(key) && !missing.has(key)) {
      missing.set(key, posting.company.trim());
    }
  }

  const entries: { id: string; name: string }[] = [];

  for (const name of missing.values()) {
    const slug = slugify(name) || "company";
    let id = slug;

    for (let number = 2; taken.has(id); number += 1) {
      id = `${slug}-${number}`;
    }

    taken.add(id);
    entries.push({ id, name });
  }

  return Effect.forEach(
    entries,
    ({ id, name }) =>
      createCompanyEffect({
        id,
        name,
        field: "",
        headquarters: "",
        funding: "",
        website: "",
        note: "",
      }).pipe(
        // Another run added it meanwhile.
        Effect.catchTag("ConflictError", () => Effect.void),
      ),
    { concurrency: WRITE_CONCURRENCY, discard: true },
  ).pipe(Effect.as(entries.length > 0));
}

/** Whether a company is due: never checked, checked long ago, or forced. */
function isDue(company: CompanyRecord, options: CheckOptions, now: number): boolean {
  if (options.keys !== undefined && !options.keys.has(companyKey(company.name))) {
    return false;
  }

  return (
    options.force === true ||
    company.checkedAt === "" ||
    now - Date.parse(company.checkedAt) > RECHECK_MS
  );
}

/** What the sources found, over what the company has: typed fields stay. */
function merge(
  company: CompanyRecord,
  yc: YcFacts | undefined,
  wikidata: WikidataFacts | undefined,
  ads: readonly JobPostingRecord[],
): FoundFacts {
  const ad = adFacts(
    ads
      .filter((posting) => posting.description !== "")
      .map((posting) => ({ id: posting.id, text: posting.description })),
  );
  const batch = yc?.batch || ad.batch;
  const sources: CompanySource[] = [];

  if (yc !== undefined) {
    sources.push({ kind: "yc", url: yc.url, text: batch === "" ? "YC" : `YC ${batch}` });
  }

  if (ad.venture) {
    sources.push({ kind: "ad", url: ad.postingId, text: ad.evidence });
  }

  if (wikidata !== undefined) {
    sources.push({ kind: "wikidata", url: wikidata.url, text: "Wikidata" });
  }

  return {
    field: company.field || yc?.field || wikidata?.field || "",
    headquarters: company.headquarters || yc?.headquarters || wikidata?.headquarters || "",
    funding: company.funding || yc?.funding || (ad.venture ? "vc" : "") || wikidata?.funding || "",
    website: company.website || yc?.website || wikidata?.website || "",
    batch,
    sources,
  };
}

/**
 * Describes the due companies from the free sources, until the deadline.
 * Adds the companies postings name first. Never fails for a source that
 * fails: it reports it, and the next run tries again.
 */
function checkCompaniesEffect(
  options: CheckOptions,
): Effect.Effect<CompanyCheckRun, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const run: CompanyCheckRun = { checked: [], left: 0, failed: [] };
    const [postings, initialStored] = yield* Effect.all(
      [listPostingsEffect(), listCompaniesEffect()],
      { concurrency: "unbounded" },
    );
    const addedMissing = yield* addMissingEffect(postings, initialStored);
    const stored = addedMissing ? yield* listCompaniesEffect() : initialStored;

    const now = yield* Clock.currentTimeMillis;
    const due = stored
      .filter((company) => isDue(company, options, now))
      // Never checked first, then the longest ago.
      .toSorted((one, other) => one.checkedAt.localeCompare(other.checkedAt));
    const batch = due.slice(0, MAX_PER_RUN);

    run.left = due.length - batch.length;

    if (batch.length === 0) {
      return run;
    }

    const ycResult = yield* Effect.result(loadYcListEffect());

    if (Result.isFailure(ycResult)) {
      run.failed.push(`yc: ${ycResult.failure.message}`);
      run.left = due.length;

      return run;
    }

    const yc = ycResult.success;

    // Wikidata only for the companies YC doesn't know: it rarely knows startups.
    const outsideYc = batch
      .map((company) => ({ key: companyKey(company.name), name: company.name }))
      .filter(({ key }) => !yc.has(key));
    const wikidataResult = yield* Effect.result(wikidataFactsEffect(outsideYc, options.deadline));
    let wikidata: ReadonlyMap<string, WikidataFacts | undefined> = new Map();

    if (Result.isSuccess(wikidataResult)) {
      wikidata = wikidataResult.success;
    } else {
      run.failed.push(`wikidata: ${wikidataResult.failure.message}`);
    }

    const postingsByKey = Map.groupBy(postings, (posting) => companyKey(posting.company));

    yield* Effect.forEach(
      batch,
      (company) =>
        Effect.gen(function* () {
          const key = companyKey(company.name);
          const ycFacts = yc.get(key);

          // Not in YC and not searched on Wikidata (out of time, or it failed): next run.
          if (ycFacts === undefined && !wikidata.has(key)) {
            run.left += 1;

            return;
          }

          yield* storeFactsEffect(
            company.id,
            merge(company, ycFacts, wikidata.get(key), postingsByKey.get(key) ?? []),
          );
          run.checked.push(company.id);
        }),
      { concurrency: WRITE_CONCURRENCY, discard: true },
    );

    return run;
  });
}

/**
 * Checks companies without failing what called it: a collector run, a saved
 * posting. A company that couldn't be checked stays due; the scheduled job
 * tries again and reports what failed.
 */
function checkCompaniesQuietlyEffect(options: CheckOptions): Effect.Effect<void, never, Database> {
  return Effect.ignore(checkCompaniesEffect(options));
}

/**
 * Describes the due companies from the free sources, until the deadline.
 * Adds the companies postings name first. Never throws for a source that
 * fails: it reports it, and the next run tries again.
 */
async function checkCompanies(options: CheckOptions): Promise<CompanyCheckRun> {
  return runServerEffect(checkCompaniesEffect(options));
}

/**
 * Checks companies without failing what called it: a collector run, a saved
 * posting. A company that couldn't be checked stays due; the scheduled job
 * tries again and reports what failed.
 */
async function checkCompaniesQuietly(options: CheckOptions): Promise<void> {
  return runServerEffect(checkCompaniesQuietlyEffect(options));
}

export { checkCompanies, checkCompaniesEffect, checkCompaniesQuietly, checkCompaniesQuietlyEffect };
export type { CheckOptions, CompanyCheckRun };
