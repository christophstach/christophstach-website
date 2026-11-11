/** A project shown on /curriculum, stored in the database and edited in the desk. */
interface Project {
  /** URL slug, e.g. /desk/content/projects/ai-agent-platform. */
  id: string;
  title: string;
  description: string;
  tech: string[];
  /** Optional link to the project; empty shows none. */
  url: string;
}

/** A project as the desk edits it, with its desk-only name and note. */
interface ProjectRecord extends Project {
  /** Desk only: how the desk lists it. Never shown on the site. */
  name: string;
  /** Desk only: what it is for. Never shown on the site. */
  note: string;
}

export type { Project, ProjectRecord };
