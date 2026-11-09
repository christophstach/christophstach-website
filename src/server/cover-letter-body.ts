import "server-only";
import { COVER_LETTER_LANGUAGES } from "../data/cover-letter-wording";
import type { CoverLetter } from "../data/cover-letters";
import { HttpError } from "./http";

// URL slug: lowercase words joined by single hyphens, e.g. "acme-frontend".
const LETTER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

const TEXT_FIELDS = [
  "label",
  "note",
  "variantId",
  "company",
  "recipient",
  "jobTitle",
  "jobUrl",
  "jobDescription",
  "letterDate",
  "subject",
  "salutation",
  "body",
  "closing",
] as const;

function isLetter(value: Partial<CoverLetter>): boolean {
  return (
    TEXT_FIELDS.every((field) => typeof value[field] === "string") &&
    value.label?.trim() !== "" &&
    value.company?.trim() !== "" &&
    (value.letterDate === "" || ISO_DATE.test(value.letterDate ?? "")) &&
    COVER_LETTER_LANGUAGES.some((language) => language === value.language)
  );
}

/** Checks the shape of a cover letter sent by the desk; the route's id wins. */
function parseCoverLetterBody(id: string, body: unknown): CoverLetter {
  const value = (body ?? {}) as Partial<CoverLetter>;

  if (!LETTER_ID.test(id)) {
    throw new HttpError(400, `"${id}" is no valid id: use lowercase letters, digits and hyphens.`);
  }

  if (!isLetter(value)) {
    throw new HttpError(400, "Not a cover letter.");
  }

  const letter = value as CoverLetter;

  return {
    id,
    label: letter.label.trim(),
    note: letter.note.trim(),
    variantId: letter.variantId.trim(),
    company: letter.company.trim(),
    recipient: letter.recipient.trim(),
    jobTitle: letter.jobTitle.trim(),
    jobUrl: letter.jobUrl.trim(),
    jobDescription: letter.jobDescription.trim(),
    language: letter.language,
    letterDate: letter.letterDate,
    subject: letter.subject.trim(),
    salutation: letter.salutation.trim(),
    body: letter.body.trim(),
    closing: letter.closing.trim(),
  };
}

export { parseCoverLetterBody };
