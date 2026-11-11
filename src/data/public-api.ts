// The public data endpoints' answers, shared by the routes that build them
// and the pages that read them (through the ISR cache, so they arrive as JSON).
import { array, object, optional, string } from "zod/mini";
import type { output } from "zod/mini";

const skillGroupSchema = object({ label: string(), title: string(), items: array(string()) });

/** GET /api/cv-home: when and where each job ran, and every skill group. */
const jobSchema = object({ from: string(), to: optional(string()), organization: string() });

const cvHomeSchema = object({ experience: array(jobSchema), skills: array(skillGroupSchema) });

type CvHome = output<typeof cvHomeSchema>;

const stringsSchema = array(string());
const linkSchema = object({ text: string(), href: string() });
const linksSchema = array(linkSchema);

/** An entry as a CV prints it: only the picked bullets, in order. */
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

/** GET /api/cv-website: what /curriculum shows of the website CV. */
const cvWebsiteSchema = object({
  experience: array(printedEntrySchema),
  education: array(printedEntrySchema),
  projects: array(projectSchema),
});

type CvWebsite = output<typeof cvWebsiteSchema>;
type CvWebsiteEntry = output<typeof printedEntrySchema>;
type CvWebsiteProject = output<typeof projectSchema>;

export type { CvHome, CvWebsite, CvWebsiteEntry, CvWebsiteProject };
export { cvHomeSchema, cvWebsiteSchema, skillGroupSchema };
