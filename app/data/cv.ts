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

/**
 * The CV's building blocks, stored in the database and edited in the desk.
 * Variants pick from them by id; the profile below stays in code.
 */
export interface CvContent {
  experience: TimelineEntry[];
  education: TimelineEntry[];
  skills: SkillGroup[];
  projects: Project[];
}

export interface ProfileLink {
  label: string;
  href: string;
}

export const profile = {
  name: "Christoph Stach",
  role: "Senior Full-Stack Engineer",
  location: "Berlin, Germany",
  email: "christoph.stach@gmail.com",
  phone: "+49 176 480 97681",
  coreTechnologies: [
    "TypeScript",
    "Vue",
    "Nuxt",
    "React",
    "Next.js",
    "Tailwind",
    "NestJS",
    "Python",
    "LLMs",
    "Kubernetes",
  ],
  links: [
    { label: "Website", href: "https://christophstach.de" },
    { label: "GitHub", href: "https://github.com/christophstach" },
    { label: "LinkedIn", href: "https://linkedin.com/in/christoph-stach-7586b958" },
  ] satisfies ProfileLink[],
};
