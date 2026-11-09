// The public data endpoints' answers, shared by the routes that build them
// and the pages that read them (through the ISR cache, so they arrive as JSON).
import { array, object, optional, string } from "zod/mini";
import type { output } from "zod/mini";

const skillGroupSchema = object({ label: string(), title: string(), items: array(string()) });

/** GET /api/cv-home: when and where each job ran, and every skill group. */
const jobSchema = object({ from: string(), to: optional(string()), organization: string() });

const cvHomeSchema = object({ experience: array(jobSchema), skills: array(skillGroupSchema) });

type CvHome = output<typeof cvHomeSchema>;

export type { CvHome };
export { cvHomeSchema, skillGroupSchema };
