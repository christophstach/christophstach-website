/** One entry of a variant: which timeline entry, and which of its bullets in what order. */
interface EntryPick {
  /** A TimelineEntry id from cv.ts. */
  id: string;
  /** Bullet ids of that entry, in print order; empty prints none. */
  bullets: string[];
}

/**
 * A printed CV assembled from the building blocks in cv.ts. Variants only
 * choose and order content; the layout is the same CvDocument for all of them,
 * so a variant can't change the design. Variants are stored in the database
 * (server/db) and edited in the desk; saving one with an unknown id fails.
 */
interface CvVariant {
  /** URL slug, e.g. /desk/cv-print/frontend. */
  id: string;
  /** Name shown in the desk. */
  label: string;
  /** Desk only: what it is for. Never printed. */
  note: string;
  /** Role line under the name; empty prints none. */
  role: string;
  /** One line under the role: how the career fits together for this kind of job. Empty prints none. */
  summary: string;
  /** Printed under the summary, in this order; empty prints none. */
  coreTechnologies: string[];
  experience: EntryPick[];
  education: EntryPick[];
  /** Project ids, in display order; only /curriculum shows them, not the PDF. */
  projects: string[];
  /** SkillGroup labels to print as a skills section; empty prints none. */
  skills: string[];
}

/**
 * Shows the download buttons for the primary CV on the home and curriculum
 * pages. Temporarily off while the CV is reworked; set back to true to show
 * them again. The PDF route and the desk keep working either way.
 */
const cvDownloadVisible = false;

export type { CvVariant, EntryPick };
export { cvDownloadVisible };
