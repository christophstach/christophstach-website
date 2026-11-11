import type { CoverLetter, CoverLetterLanguage, PrintedCoverLetter } from "../data/cover-letters";
import { COVER_LETTER_WORDING } from "../data/cover-letter-wording";
import type { Profile } from "../data/cv";

/** A URL and file name part, e.g. "Müller & Co" becomes "muller-co". */
function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replaceAll(/\p{Mark}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
}

/** The body's paragraphs: a blank line starts a new one. */
function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** What a letter prints; the role is the linked CV's, or else the profile's. */
function printedLetter(
  letter: CoverLetter,
  profile: Profile,
  cvRole: string | undefined,
): PrintedCoverLetter {
  return {
    language: letter.language,
    recipient: letter.recipient,
    letterDate: letter.letterDate,
    subject: letter.subject,
    salutation: letter.salutation,
    body: letter.body,
    closing: letter.closing,
    profile,
    role: cvRole === undefined || cvRole === "" ? profile.role : cvRole,
  };
}

type Wording = Pick<CoverLetter, "language" | "jobTitle" | "subject" | "salutation" | "closing">;

/**
 * The wording after a change of language or job title. Only text that is still
 * the default follows; whatever was written by hand stays.
 */
function rewordLetter<Letter extends Wording>(
  letter: Letter,
  language: CoverLetterLanguage,
  jobTitle: string,
): Letter {
  const from = COVER_LETTER_WORDING[letter.language];
  const to = COVER_LETTER_WORDING[language];

  return {
    ...letter,
    language,
    jobTitle,
    subject:
      letter.subject === from.subject(letter.jobTitle) ? to.subject(jobTitle) : letter.subject,
    salutation: letter.salutation === from.salutation ? to.salutation : letter.salutation,
    closing: letter.closing === from.closing ? to.closing : letter.closing,
  };
}

export { paragraphs, printedLetter, rewordLetter, slugify };
