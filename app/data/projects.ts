/** A project shown on /curriculum, stored in the database and edited in the desk. */
interface Project {
  /** URL slug, e.g. /desk/cv/projects/ai-agent-platform. */
  id: string;
  title: string;
  description: string;
  tech: string[];
  /** Optional link to the project; empty shows none. */
  url: string;
}

export type { Project };
