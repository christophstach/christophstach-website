// The public data endpoints' answers, shared by the routes that build them
// and the pages that read them (through the ISR cache, so they arrive as JSON).
import { Schema } from "effect";
import { array, object, optional, string } from "zod/mini";

const MutableStringsSchema = Schema.mutable(Schema.Array(Schema.String));

const SkillGroupSchema = Schema.Struct({
  label: Schema.String,
  title: Schema.String,
  items: MutableStringsSchema,
});

/** GET /api/cv-home: when and where each job ran, and every skill group. */
const JobSchema = Schema.Struct({
  from: Schema.String,
  to: Schema.optional(Schema.String),
  organization: Schema.String,
});

const CvHomeSchema = Schema.Struct({
  experience: Schema.mutable(Schema.Array(JobSchema)),
  skills: Schema.mutable(Schema.Array(SkillGroupSchema)),
});

type CvHome = typeof CvHomeSchema.Type;

const LinkSchema = Schema.Struct({ text: Schema.String, href: Schema.String });
const LinksSchema = Schema.mutable(Schema.Array(LinkSchema));

/** An entry as a CV prints it: only the picked bullets, in order. */
const PrintedEntrySchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  organization: Schema.String,
  location: Schema.optional(Schema.String),
  from: Schema.String,
  to: Schema.optional(Schema.String),
  tech: Schema.optional(MutableStringsSchema),
  bullets: MutableStringsSchema,
  links: Schema.optional(LinksSchema),
});

const ProjectSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  tech: MutableStringsSchema,
  url: Schema.String,
});

/** GET /api/cv-website: what /curriculum shows of the website CV. */
const CvWebsiteSchema = Schema.Struct({
  experience: Schema.mutable(Schema.Array(PrintedEntrySchema)),
  education: Schema.mutable(Schema.Array(PrintedEntrySchema)),
  projects: Schema.mutable(Schema.Array(ProjectSchema)),
});

type CvWebsite = typeof CvWebsiteSchema.Type;
type CvWebsiteEntry = typeof PrintedEntrySchema.Type;
type CvWebsiteProject = typeof ProjectSchema.Type;

const decodeCvHome = Schema.decodeUnknownResult(CvHomeSchema);
const decodeCvWebsite = Schema.decodeUnknownResult(CvWebsiteSchema);

// Temporary W2 compat until W3/W5 callers migrate
const skillGroupSchema = object({ label: string(), title: string(), items: array(string()) });
const jobSchema = object({ from: string(), to: optional(string()), organization: string() });
const cvHomeSchema = object({ experience: array(jobSchema), skills: array(skillGroupSchema) });
const stringsSchema = array(string());
const linkSchema = object({ text: string(), href: string() });
const linksSchema = array(linkSchema);
const printedEntrySchema = object({
  id: string(),
  title: string(),
  organization: string(),
  location: optional(string()),
  from: string(),
  to: optional(string()),
  tech: optional(stringsSchema),
  bullets: stringsSchema,
  links: optional(linksSchema),
});
const projectSchema = object({
  id: string(),
  title: string(),
  description: string(),
  tech: array(string()),
  url: string(),
});
const cvWebsiteSchema = object({
  experience: array(printedEntrySchema),
  education: array(printedEntrySchema),
  projects: array(projectSchema),
});

export type { CvHome, CvWebsite, CvWebsiteEntry, CvWebsiteProject };
export {
  CvHomeSchema,
  CvWebsiteSchema,
  PrintedEntrySchema,
  ProjectSchema,
  SkillGroupSchema,
  cvHomeSchema,
  cvWebsiteSchema,
  decodeCvHome,
  decodeCvWebsite,
  skillGroupSchema,
};
