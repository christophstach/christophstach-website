import type { Profile } from "./cv";

type CoverLetterLanguage = "en" | "de";

/** A cover letter for one application, stored in the database and edited in the desk. */
interface CoverLetter {
  /** URL slug, e.g. /desk/cover-letters/acme-frontend. */
  id: string;
  /** Desk only: how the desk lists it. Never printed. */
  label: string;
  /** Desk only: what it is for. Never printed. */
  note: string;
  /** The CV variant sent with it; empty if none. Its role is printed under the name. */
  variantId: string;
  company: string;
  /** Printed under the company: a person, an address, one item per line. */
  recipient: string;
  /** Desk only, like the url and the description of the job. */
  jobTitle: string;
  jobUrl: string;
  jobDescription: string;
  /** Sets the date format and the default wording. */
  language: CoverLetterLanguage;
  /** ISO date, e.g. "2026-11-02"; empty prints none. */
  letterDate: string;
  subject: string;
  salutation: string;
  /** Plain text; a blank line starts a new paragraph. */
  body: string;
  closing: string;
}

/** A letter as the desk lists it, with its last page check. */
interface CoverLetterRecord extends CoverLetter {
  /** How full each page was, 0 to 1; empty if there was no check on this build. */
  pageFills: number[];
}

type PrintedFields =
  | "language"
  | "company"
  | "recipient"
  | "letterDate"
  | "subject"
  | "salutation"
  | "body"
  | "closing";

/** What a letter prints: no desk-only field reaches the page. */
interface PrintedCoverLetter extends Pick<CoverLetter, PrintedFields> {
  profile: Profile;
  role: string;
}

export type { CoverLetter, CoverLetterLanguage, CoverLetterRecord, PrintedCoverLetter };
