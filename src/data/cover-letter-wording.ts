import type { CoverLetterLanguage } from "./cover-letters";

const COVER_LETTER_LANGUAGES: readonly CoverLetterLanguage[] = ["en", "de"];

/** A letter prints on one fixed layout; this is its @page margin. */
const COVER_LETTER_MARGIN_MM = 24;

const COVER_LETTER_WORDING: Record<
  CoverLetterLanguage,
  {
    name: string;
    salutation: string;
    closing: string;
    /** Names the job, or stands alone while the application has no job title. */
    subject: (jobTitle: string) => string;
    /** The PDF's document title. */
    title: string;
  }
> = {
  en: {
    name: "English",
    salutation: "Dear Hiring Team,",
    closing: "Kind regards,",
    subject: (jobTitle) => (jobTitle === "" ? "Application" : `Application for ${jobTitle}`),
    title: "Cover letter",
  },
  de: {
    name: "Deutsch",
    salutation: "Sehr geehrte Damen und Herren,",
    closing: "Mit freundlichen Grüßen",
    subject: (jobTitle) => (jobTitle === "" ? "Bewerbung" : `Bewerbung als ${jobTitle}`),
    title: "Anschreiben",
  },
};

export { COVER_LETTER_LANGUAGES, COVER_LETTER_MARGIN_MM, COVER_LETTER_WORDING };
