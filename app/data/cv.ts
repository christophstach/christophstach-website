export interface TimelineLink {
  text: string;
  href: string;
}

/**
 * Bullets keyed by a stable id, in display order. The site shows all of them;
 * each CV variant (cv-variants.ts) picks the ones it prints by id, so the text
 * lives in one place however many variants use it.
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

export interface Project {
  title: string;
  description: string;
  tech: string[];
}

export const experience: TimelineEntry[] = [
  {
    id: "mbition",
    title: "Senior Full Stack Engineer",
    organization: "MBition GmbH (Mercedes-Benz)",
    location: "Berlin",
    from: "2023-10",
    tech: [
      "TypeScript",
      "Vue",
      "Nuxt",
      "NestJS",
      "Python",
      "FastAPI",
      "LLMs",
      "Model Context Protocol (MCP)",
      "Kubernetes",
      "PostgreSQL",
      "MongoDB",
    ],
    bullets: {
      sdp: "Built SDP, a no-code platform for configuring and deploying Mercedes-Benz speech applications, and ship features on it end-to-end in Vue and Nuxt with strict TypeScript, zod-validated REST contracts, and realtime updates over WebSockets",
      "agent-platform":
        "Own the Python platform that hosts our LLM agents on Kubernetes, providing the shared FastAPI service, base classes, and CI/CD that agent teams build on",
      "async-memory":
        "Cut the platform's memory use by 75% (4 GB to 1 GB) by re-architecting it from synchronous to fully asynchronous Python, removing the need for multiple worker processes",
      "ci-gitlab":
        "Halved CI/CD runtime by migrating the project from GitHub to GitLab and parallelizing the pipelines; each merge request now spins up its own Kubernetes pod, giving 140 contributors a production-like environment to validate changes in",
      "type-safety":
        "Fixed ~5,000 pre-existing type errors and made the codebase unit-testable by decoupling it with dependency injection and enforcing quality gates in CI (Ruff linting, ty static type checking, and a pytest suite)",
      monorepo:
        "Cut build times by ~50% by consolidating multiple products into a pnpm monorepo, sharing types end to end and enforcing them in CI",
      "ai-dev":
        "Led AI-assisted development across the team: authored the AGENTS.md instruction set and reusable agent skills, and set up a team wiki in the Open Knowledge Format (OKF) to make organizational knowledge agent-consumable",
      datatable:
        "Replaced tables hand-built per screen with one fully typed Vue datatable behind every list screen, with server-side pagination, sorting, and configurable filters that compile into a single database query",
      rbac: "Built a Role-Based Access Control (RBAC) system with CASL.js, enforcing one permission definition across both the Nuxt UI and the NestJS API",
    },
  },
  {
    id: "dericon",
    title: "Frontend Engineer (Working Student)",
    organization: "DERICON GmbH",
    location: "Berlin & Frankfurt",
    from: "2016-12",
    to: "2023-10",
    tech: ["Vue", "Nuxt", "React", "Remix", "TypeScript", "Angular"],
    bullets: {
      "workflow-builder":
        "Launched a graph-based no-code workflow builder (React/Remix) that let non-technical users model and deploy workflows independently",
      angular:
        "Delivered new features on an Angular-based frontend, modernizing components and improving performance and accessibility",
      integrations:
        "Built middleware and UI integrations to bridge legacy systems with modern REST APIs, simplifying data flows and de-risking migrations",
    },
  },
  {
    id: "slh",
    title: "Full Stack Developer",
    organization: "SLH GmbH",
    location: "Schüttorf",
    from: "2011-10",
    to: "2014-11",
    tech: ["JavaScript", "ExtJS", "REST", "PHP", "Symfony", "MySQL"],
    bullets: {
      "php-modernization":
        "Modernized a legacy frameset-based PHP application into a modular front-end/back-end architecture, rebuilding the UI with ExtJS on a clean PHP backend",
      stakeholders:
        "Collaborated with stakeholders to prioritize requirements, deliver new features, and resolve defects quickly",
    },
  },
];

export const education: TimelineEntry[] = [
  {
    id: "msc",
    title: "M.Sc. Applied Computer Science",
    organization: "HTW Berlin",
    from: "2019-10",
    to: "2023-10",
    bullets: {
      // The full thesis title runs two lines in print, where the reference CV omits it.
      thesis:
        "Thesis: Explorative Analysis of Data from Nanopore-Based DNA Sequencing to Identify Dilution Effects",
      specialisations: "Specialisations: AI, Deep Learning, Data Science, Bioinformatics",
      grade: "Grade: 1.1",
      exchange: "Exchange: NTUST, Taipei",
    },
    links: [{ text: "Read the thesis (PDF)", href: "/christoph-stach-master-thesis.pdf" }],
  },
  {
    id: "bsc",
    title: "B.Sc. Applied Computer Science",
    organization: "HTW Berlin",
    from: "2016-04",
    to: "2019-09",
    bullets: {
      thesis: "Thesis: Style transfer for photos using deep learning",
      grade: "Grade: 1.6",
      exchange: "Exchange: UNINTER, Cuernavaca, Mexico",
    },
  },
  {
    id: "apprenticeship",
    title: "IT Management Assistant (Apprenticeship)",
    organization: "Kortmann Beton GmbH & Co. KG",
    from: "2009-07",
    to: "2011-07",
    bullets: {
      theory: "Completed apprenticeship alongside theoretical studies",
      grade: "Grade: 2.0",
    },
  },
];

export interface SkillGroup {
  /** Terminal-style identifier used on the site. */
  label: string;
  /** Prose heading used in the PDF, which recruiters and ATS parsers read. */
  title: string;
  items: string[];
}

export const skills: SkillGroup[] = [
  {
    label: "frontend",
    title: "Frontend",
    items: [
      "React",
      "Next.js",
      "Vue",
      "Nuxt",
      "Remix",
      "TypeScript",
      "JavaScript",
      "Tailwind",
      "TanStack",
      "React Server Components",
    ],
  },
  {
    label: "backend_api",
    title: "Backend & API",
    items: ["Python", "FastAPI", "Node.js", "NestJS", "REST APIs", "zod"],
  },
  { label: "data", title: "Data", items: ["PostgreSQL", "MongoDB", "Prisma", "Drizzle"] },
  {
    label: "ai_llm",
    title: "AI & LLM",
    items: [
      "LLMs",
      "AI Agents",
      "Model Context Protocol (MCP)",
      "RAG",
      "LangChain",
      "Prompt Engineering",
    ],
  },
  {
    label: "infra_cicd",
    title: "Infrastructure & CI/CD",
    items: ["Docker", "Kubernetes", "GitLab CI", "pnpm Monorepos"],
  },
  {
    label: "practices",
    title: "Practices",
    items: [
      "AI-Assisted Development (Claude Code, GitHub Copilot)",
      "Unit Testing (Vitest, Jest, pytest)",
      "Dependency Injection",
      "Code Review",
      "Agile",
      "Scrum",
    ],
  },
];

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

export const projects: Project[] = [
  {
    title: "TIGeR (Toolkit for Integration of Generative AI Resources)",
    description:
      "The common runtime multiple Mercedes-Benz agent teams build their LLM agents on, with Agent-to-Agent and Model Context Protocol interoperability.",
    tech: ["Python", "FastAPI", "LLMs", "A2A", "MCP", "Kubernetes", "GitLab CI"],
  },
  {
    title: "SDP (Speech Development Platform)",
    description:
      "No-code platform for configuring and deploying speech applications for Mercedes-Benz.",
    tech: ["Vue", "Nuxt", "Tailwind", "NestJS", "PostgreSQL", "MongoDB", "Websockets"],
  },
  {
    title: "Crowds UI",
    description:
      "Workflow editor with graph-based task views and dynamic form generation to streamline internal processes.",
    tech: ["React", "Remix", "Tailwind"],
  },
];
