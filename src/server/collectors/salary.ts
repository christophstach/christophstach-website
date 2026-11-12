import "server-only";
import type { SalaryCurrency, Workplace } from "../../data/postings";

// Salary and workplace as job ads write them, e.g. LinkedIn's "€60K-€80K /
// year" and "Berlin (Hybrid)".

interface Salary {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: SalaryCurrency | "";
}

const NO_SALARY: Salary = { salaryMin: null, salaryMax: null, salaryCurrency: "" };

const CURRENCY_OF: Record<string, SalaryCurrency> = {
  "€": "EUR",
  $: "USD",
  "£": "GBP",
  CHF: "CHF",
  EUR: "EUR",
  USD: "USD",
  GBP: "GBP",
};

/** What a year has of each period a salary is given per. */
const PER_YEAR: Record<string, number> = { year: 1, yr: 1, month: 12, mo: 12 };

const AMOUNT = String.raw`(€|\$|£|CHF|EUR|USD|GBP)?\s?(\d+(?:[.,]\d+)*)\s?([Kk])?`;

/** "€55K-€70K / year", "$195K - $260K/yr", "€4.5K / month", "€70K / year". */
const SALARY_LINE = new RegExp(
  String.raw`^${AMOUNT}(?:\s?[-–]\s?${AMOUNT})?\s?\/\s?(year|yr|month|mo)\b`,
  "iu",
);

/** "62.5" with K → 62500; "80,000" or "80.000" without → 80000. */
function amountOf(digits: string, thousands: string | undefined): number {
  return thousands === undefined
    ? Number(digits.replaceAll(/[.,]/gu, ""))
    : Math.round(Number(digits.replace(",", ".")) * 1000);
}

/** The salary a line states, per year; NO_SALARY if the line states none. */
function readSalary(line: string): Salary {
  const match = SALARY_LINE.exec(line.trim());

  if (match === null) {
    return NO_SALARY;
  }

  const [, currencyA, digitsA = "", kA, currencyB, digitsB, kB, per = ""] = match;
  const factor = PER_YEAR[per.toLowerCase()] ?? 1;
  // "€55-70K": the K of the top counts for the bottom too.
  const low = amountOf(digitsA, kA ?? (digitsB === undefined ? undefined : kB)) * factor;
  const high = digitsB === undefined ? low : amountOf(digitsB, kB ?? kA) * factor;
  const currency = CURRENCY_OF[(currencyA ?? currencyB ?? "").toUpperCase()] ?? "";

  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0) {
    return NO_SALARY;
  }

  return {
    salaryMin: Math.min(low, high),
    salaryMax: Math.max(low, high),
    salaryCurrency: currency,
  };
}

const WORKPLACE_OF: Record<string, Workplace> = {
  remote: "remote",
  hybrid: "hybrid",
  "on-site": "onsite",
  onsite: "onsite",
  "vor ort": "onsite",
};

/** The workplace a location line ends with, e.g. "Berlin (Hybrid)"; empty if none. */
function readWorkplace(line: string): Workplace | "" {
  const mode = /\((remote|hybrid|on-?site|vor ort)\)\s*$/iu.exec(line)?.[1];

  return mode === undefined ? "" : (WORKPLACE_OF[mode.toLowerCase()] ?? "");
}

export { NO_SALARY, readSalary, readWorkplace };
export type { Salary };
