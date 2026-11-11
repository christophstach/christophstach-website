// What an application sent, frozen when it was marked as sent: the CV and the
// cover letters exactly as they printed then, kept as JSON with the
// application. The code that renders them may change after they were stored,
// so they're parsed with these schemas when read.
import { array, exactOptional, literal, nullable, object, safeParse, string } from "zod/mini";
import { COVER_LETTER_LANGUAGES } from "./cover-letter-wording";
import type { PrintedCoverLetter } from "./cover-letters";
import type { PrintedCv } from "../lib/cv";
import { cvLayoutSchema } from "./cv-print-layout";

const strings = array(string());

const profileSchema = object({
  name: string(),
  role: string(),
  location: string(),
  email: string(),
  phone: string(),
  links: array(object({ label: string(), href: string() })),
});

const entrySchema = object({
  id: string(),
  title: string(),
  organization: string(),
  location: exactOptional(string()),
  from: string(),
  to: exactOptional(string()),
  tech: exactOptional(strings),
  bullets: strings,
  links: exactOptional(array(object({ text: string(), href: string() }))),
});

const printedCvSchema = object({
  profile: profileSchema,
  role: string(),
  summary: exactOptional(string()),
  coreTechnologies: strings,
  experience: array(entrySchema),
  education: array(entrySchema),
  projects: array(
    object({
      id: string(),
      title: string(),
      description: string(),
      tech: strings,
      url: string(),
    }),
  ),
  skills: array(object({ label: string(), title: string(), items: strings })),
  layout: cvLayoutSchema,
});

const printedLetterSchema = object({
  language: literal(COVER_LETTER_LANGUAGES),
  recipient: string(),
  letterDate: string(),
  subject: string(),
  salutation: string(),
  body: string(),
  closing: string(),
  profile: profileSchema,
  role: string(),
});

const sentCopySchema = object({
  /** ISO timestamp of when it was marked as sent. */
  sentAt: string(),
  /** The CV as it printed; null if none was linked. */
  cv: nullable(printedCvSchema),
  letters: array(object({ id: string(), label: string(), letter: printedLetterSchema })),
});

/** A frozen copy; its parts render with the same components as the live ones. */
interface SentCopy {
  sentAt: string;
  cv: PrintedCv | null;
  letters: { id: string; label: string; letter: PrintedCoverLetter }[];
}

/** Parses a stored copy; undefined when it no longer fits what the desk renders. */
function readSentCopy(value: unknown): SentCopy | undefined {
  const parsed = safeParse(sentCopySchema, value);

  return parsed.success ? parsed.data : undefined;
}

export { readSentCopy, sentCopySchema };
export type { SentCopy };
