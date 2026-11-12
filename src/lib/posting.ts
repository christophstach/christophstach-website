// How the desk shows and groups postings: salary, workplace, likely duplicates.
import { SALARY_SYMBOLS, WORKPLACE_LABELS } from "../data/postings";
import type { JobPosting, Workplace } from "../data/postings";

type Salary = Pick<JobPosting, "salaryMin" | "salaryMax" | "salaryCurrency">;

/** 60000 → "60K", 62500 → "62.5K", 950 → "950". */
function thousands(amount: number): string {
  return amount >= 1000 ? `${Math.round(amount / 100) / 10}K` : String(amount);
}

/** "€60K–80K", "$195K–260K", "€70K"; empty if no salary is stated. */
function formatSalary(salary: Salary): string {
  const { salaryMin: min, salaryMax: max } = salary;

  if (min === null && max === null) {
    return "";
  }

  const symbol = salary.salaryCurrency === "" ? "" : SALARY_SYMBOLS[salary.salaryCurrency];
  const range =
    min !== null && max !== null && min !== max
      ? `${thousands(min)}–${thousands(max)}`
      : thousands(max ?? min ?? 0);

  return `${symbol}${range}`;
}

/** The most the posting pays (its top, else its bottom); null if no salary is stated. */
function salaryTop(salary: Salary): number | null {
  return salary.salaryMax ?? salary.salaryMin;
}

/**
 * Salary bands for the inbox filter, by the most a posting pays. A band takes
 * its upper end: "€60K–80K" tops out at 80K, so it is in 60K–80K.
 */
const SALARY_BANDS = [
  { value: "100", label: "over 100K", above: 100_000 },
  { value: "80", label: "80K–100K", above: 80_000 },
  { value: "60", label: "60K–80K", above: 60_000 },
  { value: "0", label: "up to 60K", above: 0 },
] as const;

/** The band a posting's salary falls in; "" if none is stated. */
function salaryBand(salary: Salary): string {
  const top = salaryTop(salary);

  return top === null ? "" : (SALARY_BANDS.find((band) => top > band.above)?.value ?? "");
}

const shortDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-12" → "12 Nov 2026", short enough for a table column. */
function formatShortDay(isoDate: string): string {
  return shortDay.format(new Date(`${isoDate}T00:00:00Z`));
}

/** A gender tag after a job title: "(m/w/d)", "(f/m/x)", "(all genders)", "(gn)". */
const GENDER_TAG =
  /\(\s*(?:[mwfdxi*]{1,2}(?:\s*[/|,]\s*[mwfdxi*]{1,2}){1,3}|all genders|alle geschlechter|gn\*?)\s*\)/giu;

/** A company's legal form at its end, e.g. "GmbH", "SE", "Inc.". */
const LEGAL_FORM = /\b(?:gmbh(?: & co\.? kg)?|ag|se|kg|ug|inc|ltd|llc|bv|sa)\.?$/iu;

/** Lowercase words only: no accents, punctuation or extra spaces. */
function words(text: string): string {
  return text
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * What a posting is, for spotting the same job twice: its company and its
 * title, without gender tags or legal forms. Empty if either is missing.
 */
function jobKey(posting: Pick<JobPosting, "company" | "title">): string {
  const company = words(posting.company.trim().replace(LEGAL_FORM, ""));
  const title = words(posting.title.replaceAll(GENDER_TAG, " "));

  return company === "" || title === "" ? "" : `${company}|${title}`;
}

/**
 * The likely duplicates of each posting: others with the same company and
 * title. LinkedIn gives a reposted job, or one posted per city, a new id, so
 * the ids alone don't catch them. Postings without one are left out.
 */
function findDuplicates<Posting extends Pick<JobPosting, "id" | "company" | "title">>(
  postings: readonly Posting[],
): Map<string, Posting[]> {
  const byKey = new Map<string, Posting[]>();

  for (const posting of postings) {
    const key = jobKey(posting);

    if (key !== "") {
      byKey.set(key, [...(byKey.get(key) ?? []), posting]);
    }
  }

  const duplicates = new Map<string, Posting[]>();

  for (const group of byKey.values()) {
    for (const posting of group.length > 1 ? group : []) {
      duplicates.set(
        posting.id,
        group.filter((other) => other.id !== posting.id),
      );
    }
  }

  return duplicates;
}

/** "Remote", "Hybrid", "On-site"; empty if not stated. */
function workplaceLabel(workplace: Workplace | ""): string {
  return workplace === "" ? "" : WORKPLACE_LABELS[workplace];
}

export {
  SALARY_BANDS,
  workplaceLabel,
  findDuplicates,
  formatSalary,
  formatShortDay,
  jobKey,
  salaryBand,
  salaryTop,
};
