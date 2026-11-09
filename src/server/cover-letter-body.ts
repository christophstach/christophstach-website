import "server-only";
import { emptyOrMatching, parseInput, requireSlug, text, trimmed } from "./input";
import { literal, object } from "zod/mini";
import { COVER_LETTER_LANGUAGES } from "../data/cover-letter-wording";
import type { CoverLetter } from "../data/cover-letters";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const NOT_LETTER = "Not a cover letter.";

const coverLetterSchema = object(
  {
    label: text(NOT_LETTER),
    note: trimmed(NOT_LETTER),
    variantId: trimmed(NOT_LETTER),
    company: text(NOT_LETTER),
    recipient: trimmed(NOT_LETTER),
    jobTitle: trimmed(NOT_LETTER),
    jobUrl: trimmed(NOT_LETTER),
    jobDescription: trimmed(NOT_LETTER),
    language: literal(COVER_LETTER_LANGUAGES, NOT_LETTER),
    letterDate: emptyOrMatching(ISO_DATE, NOT_LETTER),
    subject: trimmed(NOT_LETTER),
    salutation: trimmed(NOT_LETTER),
    body: trimmed(NOT_LETTER),
    closing: trimmed(NOT_LETTER),
  },
  NOT_LETTER,
);

/** Checks the shape of a cover letter sent by the desk; the route's id wins. */
function parseCoverLetterBody(id: string, body: unknown): CoverLetter {
  requireSlug(id);

  return { id, ...parseInput(coverLetterSchema, body ?? {}) };
}

export { parseCoverLetterBody };
