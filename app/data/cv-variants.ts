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
 * so a variant can't change the design. Unknown ids fail the build.
 */
interface CvVariant {
  /** URL slug, e.g. /desk/cv-print/frontend. */
  id: string;
  /** Name shown in the desk. */
  label: string;
  /** Role line under the name. */
  role: string;
  /** One line under the role: how the career fits together for this kind of job. */
  summary?: string;
  experience: EntryPick[];
  education: EntryPick[];
  /** SkillGroup labels to print as a skills section; leave out for none. */
  skills?: string[];
}

const careerSummary =
  "Started with an IT apprenticeship and a full-time developer role, then earned a B.Sc. and an M.Sc. (1.1) in computer science while working alongside. Now building platforms at Mercedes-Benz.";

const education: EntryPick[] = [
  { id: "msc", bullets: ["specialisations", "grade", "exchange"] },
  { id: "bsc", bullets: ["thesis", "grade", "exchange"] },
  { id: "apprenticeship", bullets: [] },
];

const cvVariants: CvVariant[] = [
  {
    id: "general",
    label: "General",
    role: "Senior Full-Stack Engineer",
    summary: careerSummary,
    experience: [
      {
        id: "mbition",
        bullets: [
          "sdp",
          "agent-platform",
          "async-memory",
          "ci-gitlab",
          "type-safety",
          "monorepo",
          "ai-dev",
        ],
      },
      { id: "dericon", bullets: ["workflow-builder", "angular", "integrations"] },
      { id: "slh", bullets: ["php-modernization"] },
    ],
    education,
  },
  {
    id: "frontend",
    label: "Frontend",
    role: "Senior Frontend Engineer",
    summary: careerSummary,
    experience: [
      { id: "mbition", bullets: ["sdp", "datatable", "rbac", "monorepo", "type-safety", "ai-dev"] },
      { id: "dericon", bullets: ["workflow-builder", "angular", "integrations"] },
      { id: "slh", bullets: ["php-modernization"] },
    ],
    education,
    skills: ["frontend", "backend_api", "infra_cicd"],
  },
  {
    id: "ai-platform",
    label: "AI & Platform",
    role: "Senior Platform Engineer (AI)",
    summary: careerSummary,
    experience: [
      {
        id: "mbition",
        bullets: ["agent-platform", "async-memory", "ci-gitlab", "type-safety", "ai-dev", "sdp"],
      },
      { id: "dericon", bullets: ["workflow-builder", "integrations"] },
      { id: "slh", bullets: ["php-modernization"] },
    ],
    education,
    skills: ["ai_llm", "backend_api", "infra_cicd"],
  },
];

/** The variant on the public site, downloadable as /christoph-stach-cv.pdf. */
const primaryVariantId = "general";

export type { CvVariant, EntryPick };
export { cvVariants, primaryVariantId };
