import "server-only";
import { Schema } from "effect";
import { SALARY_CURRENCIES, WORKPLACES } from "../data/postings";
import type { JobTerms } from "../data/postings";

// Workplace and salary, as postings and applications both keep them.

const SALARY_MAX = 100_000_000;

/** A yearly salary, in whole units of its currency. */
const salarySchema = Schema.Int.annotate({ message: "A salary is a whole number." }).pipe(
  Schema.check(
    Schema.isGreaterThanOrEqualTo(0, { message: "A salary isn't negative." }),
    Schema.isLessThanOrEqualTo(SALARY_MAX, { message: "That salary is too large." }),
  ),
);

/** The workplace and salary fields of an Effect v4 `Schema.Struct`. */
function jobTermsFields(message: string) {
  return {
    workplace: Schema.Literals(["", ...WORKPLACES]).annotate({ message }),
    salaryMin: Schema.NullOr(salarySchema),
    salaryMax: Schema.NullOr(salarySchema),
    salaryCurrency: Schema.Literals(["", ...SALARY_CURRENCIES]).annotate({ message }),
  };
}

/** The check that goes with them: the salary's lower end isn't above its upper one. */
const salaryInOrderCheck = Schema.makeFilter<Pick<JobTerms, "salaryMin" | "salaryMax">>(
  (terms) =>
    terms.salaryMin === null || terms.salaryMax === null || terms.salaryMin <= terms.salaryMax,
  { message: "The salary's lower end is above its upper one." },
);

/** Effect v4 schema for workplace and salary fields with ordering check. */
function jobTermsSchema(message = "Invalid job terms.") {
  return Schema.Struct(jobTermsFields(message))
    .annotate({ message })
    .pipe(Schema.check(salaryInOrderCheck));
}

const JobTermsSchema = jobTermsSchema();

export {
  JobTermsSchema,
  SALARY_MAX,
  jobTermsFields,
  jobTermsSchema,
  salaryInOrderCheck,
  salarySchema,
};
