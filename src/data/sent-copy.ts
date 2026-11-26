// What an application sent, frozen when it was marked as sent: the CV and the
// cover letters exactly as they printed then, kept as JSON with the
// application. The code that renders them may change after they were stored,
// so they're parsed with these schemas when read.
import { Result, Schema } from "effect";
import { COVER_LETTER_LANGUAGES } from "./cover-letter-wording";
import { CvLayoutSchema } from "./cv-print-layout";
import type { PrintedCoverLetter } from "./cover-letters";
import type { PrintedCv } from "../lib/cv";

const MutableStringsSchema = Schema.mutable(Schema.Array(Schema.String));

const ProfileSchema = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
  location: Schema.String,
  email: Schema.String,
  phone: Schema.String,
  links: Schema.mutable(Schema.Array(Schema.Struct({ label: Schema.String, href: Schema.String }))),
});

const EntrySchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  organization: Schema.String,
  location: Schema.optionalKey(Schema.String),
  from: Schema.String,
  to: Schema.optionalKey(Schema.String),
  tech: Schema.optionalKey(MutableStringsSchema),
  bullets: MutableStringsSchema,
  links: Schema.optionalKey(
    Schema.mutable(Schema.Array(Schema.Struct({ text: Schema.String, href: Schema.String }))),
  ),
});

const PrintedCvSchema = Schema.Struct({
  profile: ProfileSchema,
  role: Schema.String,
  summary: Schema.optionalKey(Schema.String),
  coreTechnologies: MutableStringsSchema,
  experience: Schema.mutable(Schema.Array(EntrySchema)),
  education: Schema.mutable(Schema.Array(EntrySchema)),
  projects: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        title: Schema.String,
        description: Schema.String,
        tech: MutableStringsSchema,
        url: Schema.String,
      }),
    ),
  ),
  skills: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        label: Schema.String,
        title: Schema.String,
        items: MutableStringsSchema,
      }),
    ),
  ),
  layout: CvLayoutSchema,
});

const PrintedLetterSchema = Schema.Struct({
  language: Schema.Literals(COVER_LETTER_LANGUAGES),
  recipient: Schema.String,
  letterDate: Schema.String,
  subject: Schema.String,
  salutation: Schema.String,
  body: Schema.String,
  closing: Schema.String,
  profile: ProfileSchema,
  role: Schema.String,
});

const SentCopySchema = Schema.Struct({
  /** ISO timestamp of when it was marked as sent. */
  sentAt: Schema.String,
  /** The CV as it printed; null if none was linked. */
  cv: Schema.NullOr(PrintedCvSchema),
  letters: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        label: Schema.String,
        letter: PrintedLetterSchema,
      }),
    ),
  ),
});

/** A frozen copy; its parts render with the same components as the live ones. */
interface SentCopy {
  sentAt: string;
  cv: PrintedCv | null;
  letters: { id: string; label: string; letter: PrintedCoverLetter }[];
}

const decodeSentCopy = Schema.decodeUnknownResult(SentCopySchema);

/** Parses a stored copy; undefined when it no longer fits what the desk renders. */
function readSentCopy(value: unknown): SentCopy | undefined {
  const parsed = decodeSentCopy(value);

  return Result.isSuccess(parsed) ? parsed.success : undefined;
}

export { SentCopySchema, readSentCopy };
export type { SentCopy };
