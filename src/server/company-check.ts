import "server-only";
import type { CompanyRecord, CompanySource } from "../data/companies";
import { createCompany, listCompanies, storeFacts } from "./companies";
import type { FoundFacts } from "./companies";
import { HttpError } from "./http";
import type { JobPostingRecord } from "../data/postings";
import { adFacts } from "./company-facts/ad-text";
import { companyKey } from "../lib/posting";
import { listPostings } from "./postings";
import { loadYcList } from "./company-facts/yc";
import type { YcFacts } from "./company-facts/yc";
import { slugify } from "../lib/cover-letter";
import { wikidataFacts } from "./company-facts/wikidata";
import type { WikidataFacts } from "./company-facts/wikidata";

// Describes the postings' companies on its own, from free sources: the Y
// Combinator list, Wikidata and the ads' own text. Every company a posting
// names gets a row; a row is checked once, and again after a month. What the
// sources find only fills empty fields, so whatever was typed stays.

/** A company is checked again after this long: batches, owners and websites change. */
const RECHECK_MS = 30 * 24 * 60 * 60 * 1000;

/** At most this many companies a run; the next run takes the rest. */
const MAX_PER_RUN = 40;

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
async function addMissing(
  postings: readonly JobPostingRecord[],
  stored: readonly CompanyRecord[],
): Promise<boolean> {
  const known = new Set(stored.map((company) => companyKey(company.name)));
  const taken = new Set(stored.map((company) => company.id));
  const missing = new Map<string, string>();

  for (const posting of postings) {
    const key = companyKey(posting.company);

    if (key !== "" && !known.has(key) && !missing.has(key)) {
      missing.set(key, posting.company.trim());
    }
  }

  await Promise.all(
    [...missing.values()].map(async (name) => {
      const slug = slugify(name) || "company";
      let id = slug;

      for (let number = 2; taken.has(id); number += 1) {
        id = `${slug}-${number}`;
      }

      taken.add(id);

      try {
        await createCompany({
          id,
          name,
          field: "",
          headquarters: "",
          funding: "",
          website: "",
          note: "",
        });
      } catch (error) {
        // Another run added it meanwhile.
        if (!(error instanceof HttpError && error.status === 409)) {
          throw error;
        }
      }
    }),
  );

  return missing.size > 0;
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
 * Adds the companies postings name first. Never throws for a source that
 * fails: it reports it, and the next run tries again.
 */
async function checkCompanies(options: CheckOptions): Promise<CompanyCheckRun> {
  const run: CompanyCheckRun = { checked: [], left: 0, failed: [] };
  const postings = await listPostings();
  let stored = await listCompanies();

  if (await addMissing(postings, stored)) {
    stored = await listCompanies();
  }

  const now = Date.now();
  const due = stored
    .filter((company) => isDue(company, options, now))
    // Never checked first, then the longest ago.
    .toSorted((one, other) => one.checkedAt.localeCompare(other.checkedAt));
  const batch = due.slice(0, MAX_PER_RUN);

  run.left = due.length - batch.length;

  if (batch.length === 0) {
    return run;
  }

  let yc: ReadonlyMap<string, YcFacts>;

  try {
    yc = await loadYcList();
  } catch (error) {
    run.failed.push(`yc: ${error instanceof Error ? error.message : "failed"}`);
    run.left = due.length;

    return run;
  }

  // Wikidata only for the companies YC doesn't know: it rarely knows startups.
  const outsideYc = batch
    .map((company) => ({ key: companyKey(company.name), name: company.name }))
    .filter(({ key }) => !yc.has(key));
  let wikidata: ReadonlyMap<string, WikidataFacts | undefined> = new Map();

  try {
    wikidata = await wikidataFacts(outsideYc, options.deadline);
  } catch (error) {
    run.failed.push(`wikidata: ${error instanceof Error ? error.message : "failed"}`);
  }

  const postingsByKey = Map.groupBy(postings, (posting) => companyKey(posting.company));

  await Promise.all(
    batch.map(async (company) => {
      const key = companyKey(company.name);
      const ycFacts = yc.get(key);

      // Not in YC and not searched on Wikidata (out of time, or it failed): next run.
      if (ycFacts === undefined && !wikidata.has(key)) {
        run.left += 1;

        return;
      }

      await storeFacts(
        company.id,
        merge(company, ycFacts, wikidata.get(key), postingsByKey.get(key) ?? []),
      );
      run.checked.push(company.id);
    }),
  );

  return run;
}

/**
 * Checks companies without failing what called it: a collector run, a saved
 * posting. A company that couldn't be checked stays due; the scheduled job
 * tries again and reports what failed.
 */
async function checkCompaniesQuietly(options: CheckOptions): Promise<void> {
  try {
    await checkCompanies(options);
  } catch {
    // The scheduled job takes it.
  }
}

export { checkCompanies, checkCompaniesQuietly };
export type { CompanyCheckRun };
