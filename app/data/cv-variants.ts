import type { CvLayout } from "./cv-print-layout";

/** One entry of a variant: which timeline entry, and which of its bullets in what order. */
interface EntryPick {
  /** A TimelineEntry id from cv.ts. */
  id: string;
  /** Bullet ids of that entry, in print order; empty prints none. */
  bullets: string[];
}

/**
 * A printed CV assembled from the building blocks in cv.ts. Variants choose
 * and order content, and pick layout steps (CV_LAYOUT_STEPS in cv-print-layout.ts) to fill their
 * pages; the design is the same CvDocument for all of them. Variants are
 * stored in the database (server/db) and edited in the desk; saving one with
 * an unknown id fails.
 */
interface CvVariant {
  /** URL slug, e.g. /desk/cv-print/frontend. */
  id: string;
  /** Name shown in the desk. */
  label: string;
  /** Desk only: what it is for. Never printed. */
  note: string;
  /** Not printed on the CV; a cover letter linked to this variant prints it under the name. */
  role: string;
  /** One line under the role: how the career fits together for this kind of job. Empty prints none. */
  summary: string;
  /** Printed under the summary, in this order; empty prints none. */
  coreTechnologies: string[];
  experience: EntryPick[];
  education: EntryPick[];
  /** Project ids, in display order; printed after the education, and /curriculum shows the website variant's. */
  projects: string[];
  /** SkillGroup labels to print as a skills section; empty prints none. */
  skills: string[];
  /** Spacing, text size and page margin of the printed CV. */
  layout: CvLayout;
}

/**
 * Shows the download buttons for the primary CV on the home and curriculum
 * pages. Set to false to hide them, for example while the CV is reworked. The
 * PDF route and the desk keep working either way.
 */
const cvDownloadVisible = true;

export type { CvVariant, EntryPick };
export { cvDownloadVisible };
