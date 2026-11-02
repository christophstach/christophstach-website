import type { Project } from "./projects";

export interface TimelineLink {
  text: string;
  href: string;
}

/**
 * Bullets keyed by a stable id, in display order. Each CV variant picks the
 * ones it prints by id, so the text lives in one place however many variants
 * use it.
 */
export type Bullets = Record<string, string>;

export interface TimelineEntry {
  /** Stable id that CV variants refer to. */
  id: string;
  title: string;
  organization: string;
  location?: string;
  from: string;
  to?: string;
  tech?: string[];
  bullets?: Bullets;
  links?: TimelineLink[];
}

/**
 * A timeline entry as the database and the desk keep it: bullets as an
 * ordered list, empty strings and lists for what TimelineEntry leaves out.
 */
export interface EntryRecord {
  id: string;
  section: "experience" | "education";
  /** Desk only: how the desk lists it. Never printed or shown on the site. */
  name: string;
  /** Desk only: what it is for. Never printed or shown on the site. */
  note: string;
  title: string;
  organization: string;
  location: string;
  /** ISO month, e.g. "2023-10". */
  from: string;
  /** ISO month; empty means ongoing. */
  to: string;
  tech: string[];
  bullets: { id: string; text: string }[];
  links: TimelineLink[];
}

export interface SkillGroup {
  /** Terminal-style identifier used on the site. */
  label: string;
  /** Prose heading used in the PDF, which recruiters and ATS parsers read. */
  title: string;
  items: string[];
}

/** A skill group as the desk edits it, with its desk-only name and note. */
export interface SkillGroupRecord extends SkillGroup {
  /** Desk only: how the desk lists it. */
  name: string;
  /** Desk only: what it is for. */
  note: string;
}

/**
 * The CV's building blocks, stored in the database and edited in the desk.
 * Variants pick from them by id; every variant prints the same profile.
 */
export interface CvContent {
  profile: Profile;
  experience: TimelineEntry[];
  education: TimelineEntry[];
  skills: SkillGroup[];
  projects: Project[];
}

export interface ProfileLink {
  label: string;
  href: string;
}

/** The CV's header; one, stored in the database and edited in the desk. */
export interface Profile {
  name: string;
  /** Not printed: each variant has its own role line. */
  role: string;
  location: string;
  email: string;
  phone: string;
  links: ProfileLink[];
}
