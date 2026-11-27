import "server-only";
import { Cause, Effect, Exit, Result, Schema } from "effect";
import { COVER_LETTER_LANGUAGES } from "../data/cover-letter-wording";
import type { CoverLetter } from "../data/cover-letters";
import { type BadRequestError, toHttpError } from "./effect";
import {
  ISO_DATE_PATTERN,
  decodeBodyEffect,
  emptyOrMatchingSchema,
  requireSlugEffect,
  textSchema,
  trimmedSchema,
} from "./input";

const NOT_LETTER = "Not a cover letter.";

const CoverLetterBodySchema = Schema.Struct({
  label: textSchema(NOT_LETTER),
  note: trimmedSchema(NOT_LETTER),
  applicationId: textSchema("A cover letter needs an application."),
  recipient: trimmedSchema(NOT_LETTER),
  language: Schema.Literals(COVER_LETTER_LANGUAGES).annotate({ message: NOT_LETTER }),
  letterDate: emptyOrMatchingSchema(ISO_DATE_PATTERN, NOT_LETTER),
  subject: trimmedSchema(NOT_LETTER),
  salutation: trimmedSchema(NOT_LETTER),
  body: trimmedSchema(NOT_LETTER),
  closing: trimmedSchema(NOT_LETTER),
}).annotate({ message: NOT_LETTER });

/** Checks the shape of a cover letter sent by the desk; the route's id wins. */
function parseCoverLetterBodyEffect(
  id: string,
  body: unknown,
): Effect.Effect<CoverLetter, BadRequestError> {
  return Effect.gen(function* () {
    yield* requireSlugEffect(id);

    const parsed = yield* decodeBodyEffect(CoverLetterBodySchema, body ?? {});

    return { id, ...parsed };
  });
}

/** Checks the shape of a cover letter sent by the desk; the route's id wins. */
function parseCoverLetterBody(id: string, body: unknown): CoverLetter {
  const exit = Effect.runSyncExit(parseCoverLetterBodyEffect(id, body));

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findError(exit.cause);

  if (Result.isSuccess(failure)) {
    throw toHttpError(failure.success);
  }

  throw Cause.squash(exit.cause);
}

export { CoverLetterBodySchema, parseCoverLetterBody, parseCoverLetterBodyEffect };
