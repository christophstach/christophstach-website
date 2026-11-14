// How the desk shows and groups postings: salary, workplace, likely duplicates.
import { SALARY_SYMBOLS, WORKPLACE_LABELS } from "../data/postings";
import type { JobPosting, JobTerms, Workplace } from "../data/postings";

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
 * A company's name for matching: without its legal form, accents or
 * punctuation, so "Example Labs GmbH" and "Example Labs" are one company.
 */
function companyKey(name: string): string {
  return words(name.trim().replace(LEGAL_FORM, ""));
}

/** A job title for matching: lowercase words, without a gender tag like "(m/w/d)". */
function titleKey(title: string): string {
  return words(title.replaceAll(GENDER_TAG, " "));
}

/**
 * What a posting is, for spotting the same job twice: its company and its
 * title, without gender tags or legal forms. Empty if either is missing.
 */
function jobKey(posting: Pick<JobPosting, "company" | "title">): string {
  const company = companyKey(posting.company);
  const title = titleKey(posting.title);

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

/** Workplace and salary as a form holds them: the salary's ends as digits, or empty. */
type JobTermsForm = Omit<JobTerms, "salaryMin" | "salaryMax"> & {
  salaryMin: string;
  salaryMax: string;
};

function toTermsForm(terms: JobTerms): JobTermsForm {
  return {
    workplace: terms.workplace,
    salaryMin: terms.salaryMin === null ? "" : String(terms.salaryMin),
    salaryMax: terms.salaryMax === null ? "" : String(terms.salaryMax),
    salaryCurrency: terms.salaryCurrency,
  };
}

/** An input's amount; null if empty. A number input holds digits or nothing. */
function amountOf(value: string): number | null {
  return value.trim() === "" ? null : Math.round(Number(value));
}

function fromTermsForm(form: JobTermsForm): JobTerms {
  const salaryMin = amountOf(form.salaryMin);
  const salaryMax = amountOf(form.salaryMax);
  const stated = salaryMin !== null || salaryMax !== null;

  return {
    workplace: form.workplace,
    salaryMin,
    salaryMax,
    // A currency belongs to a salary; without one, it goes too.
    salaryCurrency: stated ? form.salaryCurrency : "",
  };
}

/** How the desk groups fit scores: 75+ fits well, under 50 hardly; "none" is unscored. */
type FitTone = "high" | "mid" | "low" | "none";

const FIT_TONES: readonly { value: FitTone; label: string }[] = [
  { value: "high", label: "Fits well (75+)" },
  { value: "mid", label: "Maybe (50–74)" },
  { value: "low", label: "Hardly (under 50)" },
  { value: "none", label: "Not scored" },
];

function fitTone(posting: Pick<JobPosting, "score">): FitTone {
  if (posting.score === null) {
    return "none";
  }

  if (posting.score.score >= 75) {
    return "high";
  }

  return posting.score.score >= 50 ? "mid" : "low";
}

/**
 * Whether a posting waits for a score, as the server picks them: not
 * dismissed, not applied to, and unscored or scored before the search notes
 * last changed (`notesAt`, an ISO timestamp; empty if never saved).
 */
function isScoreDue(
  posting: Pick<JobPosting, "status" | "score"> & { applicationId: string },
  notesAt: string,
): boolean {
  return (
    posting.status !== "dismissed" &&
    posting.applicationId === "" &&
    (posting.score === null || (notesAt !== "" && posting.score.scoredAt < notesAt))
  );
}

/** Free models on OpenRouter allow this many requests a day, counted from midnight UTC. */
const FREE_SCORES_PER_DAY = 50;

/**
 * How many postings were scored since midnight UTC: about the free requests
 * used today. A failed request counts at OpenRouter but leaves no score.
 */
function scoredToday(postings: readonly Pick<JobPosting, "score">[], now = new Date()): number {
  const since = now.toISOString().slice(0, 10);

  return postings.filter((posting) => (posting.score?.scoredAt ?? "") >= since).length;
}

/** "Remote", "Hybrid", "On-site"; empty if not stated. */
function workplaceLabel(workplace: Workplace | ""): string {
  return workplace === "" ? "" : WORKPLACE_LABELS[workplace];
}

export {
  FIT_TONES,
  FREE_SCORES_PER_DAY,
  SALARY_BANDS,
  companyKey,
  fitTone,
  isScoreDue,
  scoredToday,
  workplaceLabel,
  findDuplicates,
  formatSalary,
  formatShortDay,
  fromTermsForm,
  jobKey,
  titleKey,
  salaryBand,
  salaryTop,
  toTermsForm,
};
export type { FitTone, JobTermsForm };
