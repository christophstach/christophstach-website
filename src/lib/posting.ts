// How the desk shows and groups a posting's salary.
import { SALARY_SYMBOLS } from "../data/postings";
import type { JobPosting } from "../data/postings";

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

export { SALARY_BANDS, formatSalary, salaryBand, salaryTop };
