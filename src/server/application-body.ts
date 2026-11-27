import "server-only";
import { Cause, Effect, Exit, Result, Schema } from "effect";
import { APPLICATION_SOURCES, APPLICATION_STATUSES } from "../data/applications";
import type { Application } from "../data/applications";
import { SALARY_CURRENCIES, WORKPLACES } from "../data/postings";
import { type BadRequestError, toHttpError } from "./effect";
import {
  ISO_DATE_PATTERN,
  decodeBodyEffect,
  emptyOrMatchingSchema,
  isoDateSchema,
  requireSlugEffect,
  requireUniqueEffect,
  textSchema,
  trimmedSchema,
} from "./input";

const NOT_APPLICATION = "Not an application.";

const salarySchema = Schema.Int.annotate({ message: "A salary is a whole number." }).pipe(
  Schema.check(
    Schema.isGreaterThanOrEqualTo(0, { message: "A salary isn't negative." }),
    Schema.isLessThanOrEqualTo(100_000_000, { message: "That salary is too large." }),
  ),
);

const ContactSchema = Schema.Struct({
  id: textSchema(NOT_APPLICATION),
  name: trimmedSchema(NOT_APPLICATION),
  role: trimmedSchema(NOT_APPLICATION),
  email: trimmedSchema(NOT_APPLICATION),
  phone: trimmedSchema(NOT_APPLICATION),
}).annotate({ message: NOT_APPLICATION });

const EventSchema = Schema.Struct({
  id: textSchema(NOT_APPLICATION),
  date: isoDateSchema("Every history entry needs a date."),
  text: textSchema("Every history entry needs a text."),
}).annotate({ message: NOT_APPLICATION });

const ApplicationBodySchema = Schema.Struct({
  company: textSchema("The company can't be empty."),
  jobTitle: trimmedSchema(NOT_APPLICATION),
  jobUrl: trimmedSchema(NOT_APPLICATION),
  jobDescription: trimmedSchema(NOT_APPLICATION),
  location: trimmedSchema(NOT_APPLICATION),
  workplace: Schema.Literals(["", ...WORKPLACES] as const).annotate({ message: NOT_APPLICATION }),
  salaryMin: Schema.NullOr(salarySchema),
  salaryMax: Schema.NullOr(salarySchema),
  salaryCurrency: Schema.Literals(["", ...SALARY_CURRENCIES] as const).annotate({
    message: NOT_APPLICATION,
  }),
  source: Schema.Literals(APPLICATION_SOURCES).annotate({ message: NOT_APPLICATION }),
  status: Schema.Literals(APPLICATION_STATUSES).annotate({ message: NOT_APPLICATION }),
  cvId: trimmedSchema(NOT_APPLICATION),
  appliedOn: emptyOrMatchingSchema(ISO_DATE_PATTERN, NOT_APPLICATION),
  nextStep: trimmedSchema(NOT_APPLICATION),
  nextStepOn: emptyOrMatchingSchema(ISO_DATE_PATTERN, NOT_APPLICATION),
  contacts: Schema.mutable(Schema.Array(ContactSchema)).annotate({ message: NOT_APPLICATION }),
  events: Schema.mutable(Schema.Array(EventSchema)).annotate({ message: NOT_APPLICATION }),
  note: trimmedSchema(NOT_APPLICATION),
})
  .annotate({ message: NOT_APPLICATION })
  .pipe(
    Schema.check(
      Schema.makeFilter(
        (terms) =>
          terms.salaryMin === null ||
          terms.salaryMax === null ||
          terms.salaryMin <= terms.salaryMax,
        { message: "The salary's lower end is above its upper one." },
      ),
    ),
  );

/**
 * Checks the shape of an application sent by the desk; the route's id wins.
 * A contact without a name is dropped, the history is sorted by date.
 */
function parseApplicationBodyEffect(
  id: string,
  body: unknown,
): Effect.Effect<Application, BadRequestError> {
  return Effect.gen(function* () {
    yield* requireSlugEffect(id);

    const application = yield* decodeBodyEffect(ApplicationBodySchema, body ?? {});

    yield* requireUniqueEffect(
      application.contacts.map((contact) => contact.id),
      "contact",
    );
    yield* requireUniqueEffect(
      application.events.map((event) => event.id),
      "history entry",
    );

    return {
      id,
      ...application,
      contacts: application.contacts.filter((contact) => contact.name !== ""),
      events: application.events.toSorted((first, second) => first.date.localeCompare(second.date)),
    };
  });
}

/**
 * Checks the shape of an application sent by the desk; the route's id wins.
 * A contact without a name is dropped, the history is sorted by date.
 */
function parseApplicationBody(id: string, body: unknown): Application {
  const exit = Effect.runSyncExit(parseApplicationBodyEffect(id, body));

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findError(exit.cause);

  if (Result.isSuccess(failure)) {
    throw toHttpError(failure.success);
  }

  throw Cause.squash(exit.cause);
}

export { ApplicationBodySchema, parseApplicationBody, parseApplicationBodyEffect };
