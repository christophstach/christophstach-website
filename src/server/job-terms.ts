import "server-only";
import { SALARY_CURRENCIES, WORKPLACES } from "../data/postings";
import { int, literal, maximum, minimum, nullable, refine } from "zod/mini";
import type { JobTerms } from "../data/postings";

// Workplace and salary, as postings and applications both keep them.

/** A yearly salary, in whole units of its currency. */
const salary = int("A salary is a whole number.").check(
  minimum(0, "A salary isn't negative."),
  maximum(100_000_000, "That salary is too large."),
);

/** The workplace and salary fields of an object schema. */
function jobTermsShape(message: string) {
  return {
    workplace: literal(["", ...WORKPLACES], message),
    salaryMin: nullable(salary),
    salaryMax: nullable(salary),
    salaryCurrency: literal(["", ...SALARY_CURRENCIES], message),
  };
}

/** The check that goes with them: the salary's lower end isn't above its upper one. */
const salaryInOrder = refine<Pick<JobTerms, "salaryMin" | "salaryMax">>(
  (terms: Pick<JobTerms, "salaryMin" | "salaryMax">) =>
    terms.salaryMin === null || terms.salaryMax === null || terms.salaryMin <= terms.salaryMax,
  "The salary's lower end is above its upper one.",
);

export { jobTermsShape, salaryInOrder };
