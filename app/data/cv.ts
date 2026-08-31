export interface TimelineLink {
  text: string;
  href: string;
}

/**
 * A bullet. A plain string appears everywhere; the object form limits it to one
 * output, so the PDF can stay as lean as a recruiter expects while the site
 * keeps the full detail. Same text, one place.
 */
export type Bullet = string | { text: string; only: "web" | "print" };

export interface TimelineEntry {
  title: string;
  organization: string;
  location?: string;
  from: string;
  to?: string;
  tech?: string[];
  bullets?: Bullet[];
  links?: TimelineLink[];
}

export interface Project {
  title: string;
  description: string;
  tech: string[];
}

export const experience: TimelineEntry[] = [
  {
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
      "Agent-to-Agent (A2A)",
      "Model Context Protocol (MCP)",
      "Kubernetes",
      "GitLab CI",
      "PostgreSQL",
      "MongoDB",
      "Azure DevOps",
    ],
    bullets: [
      "Ship product features end-to-end in Vue and Nuxt with strict TypeScript — component architecture, composables, and zod-validated REST contracts shared across the stack",
      "Built a Role-Based Access Control (RBAC) system with CASL.js, enforcing one permission definition across both the Nuxt UI and the NestJS API",
      "Consolidated multiple products into a pnpm monorepo, cutting build times by ~50% and enabling end-to-end type-safety and better DX",
      "Build and operate a Python platform that hosts multiple LLM agents on Kubernetes — providing the shared FastAPI web service, base classes, and CI/CD that individual agent teams plug their business logic into, built on LangChain, OpenAI APIs, and retrieval-augmented generation (RAG)",
      "Drove AI-assisted development across the team: authored the AGENTS.md instruction set and reusable agent skills, and set up a team wiki in the Open Knowledge Format (OKF) to make organizational knowledge agent-consumable",
      "Re-architected the platform from synchronous to fully asynchronous Python (async/await), removing the need for multiple worker processes and cutting memory consumption by 75% (4 GB to 1 GB); right-sized Kubernetes requests, limits, and autoscaling to realize the saving across the cluster",
      "Decoupled the codebase with dependency injection so components can be mocked and unit-tested in isolation, then enforced quality gates in CI — Ruff linting, ty static type checking, and a pytest suite — surfacing and fixing ~5,000 pre-existing type errors",
      "Migrated the project from GitHub to GitLab and parallelized the CI/CD pipelines, halving runtime; each merge request now spins up its own Kubernetes pod, giving 140 contributors a production-like environment to validate changes in",
    ],
  },
  {
    title: "Frontend Engineer",
    organization: "DERICON GmbH",
    location: "Berlin & Frankfurt",
    from: "2016-12",
    to: "2023-10",
    tech: ["React", "Remix", "Vue", "Nuxt", "Angular", "TypeScript"],
    bullets: [
      "Launched a graph-based no-code workflow builder (React/Remix) that let non-technical users model and deploy workflows independently",
      "Delivered new features on an Angular-based frontend, modernizing components and improving performance and accessibility",
      "Built middleware and UI integrations to bridge legacy systems with modern REST APIs, simplifying data flows and de-risking migrations",
    ],
  },
  {
    title: "Full Stack Developer",
    organization: "SLH GmbH",
    location: "Schüttorf",
    from: "2011-10",
    to: "2014-11",
    tech: ["JavaScript", "ExtJS", "REST", "PHP", "Symfony", "MySQL"],
    bullets: [
      "Modernized a legacy frameset-based PHP application into a modular front-end/back-end architecture, rebuilding the UI with ExtJS on a clean PHP backend",
      {
        text: "Collaborated with stakeholders to prioritize requirements, deliver new features, and resolve defects quickly",
        only: "web",
      },
    ],
  },
];

export const education: TimelineEntry[] = [
  {
    title: "M.Sc. Applied Computer Science",
    organization: "HTW Berlin",
    from: "2019-10",
    to: "2023-10",
    bullets: [
      // The full thesis title runs two lines in print, where the reference CV omits it.
      {
        text: "Thesis: Explorative Analysis of Data from Nanopore-Based DNA Sequencing to Identify Dilution Effects",
        only: "web",
      },
      "Specialisations: AI, Deep Learning, Data Science, Bioinformatics",
      "Grade: 1.1",
      "Exchange: NTUST, Taipei",
    ],
    links: [{ text: "Read the thesis (PDF)", href: "/christoph-stach-master-thesis.pdf" }],
  },
  {
    title: "B.Sc. Applied Computer Science",
    organization: "HTW Berlin",
    from: "2016-04",
    to: "2019-09",
    bullets: [
      "Thesis: Style transfer for photos using deep learning",
      "Grade: 1.6",
      "Exchange: UNINTER, Cuernavaca, Mexico",
    ],
  },
  {
    title: "IT Management Assistant (Apprenticeship)",
    organization: "Kortmann Beton GmbH & Co. KG",
    from: "2009-07",
    to: "2011-07",
    bullets: [
      { text: "Completed apprenticeship alongside theoretical studies", only: "web" },
      { text: "Grade: 2.0", only: "web" },
    ],
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
    label: "ai_llm",
    title: "AI & LLM",
    items: [
      "LLMs",
      "AI Agents",
      "Agent-to-Agent (A2A)",
      "Model Context Protocol (MCP)",
      "Open Knowledge Format (OKF)",
      "RAG",
      "LangChain",
      "OpenAI API",
      "Prompt Engineering",
    ],
  },
  {
    label: "backend_api",
    title: "Backend & API",
    items: [
      "Python",
      "Async Python (async/await)",
      "FastAPI",
      "Node.js",
      "NestJS",
      "REST APIs",
      "zod",
    ],
  },
  { label: "data", title: "Data", items: ["PostgreSQL", "MongoDB", "Prisma", "Drizzle"] },
  {
    label: "infra_cicd",
    title: "Infrastructure & CI/CD",
    items: ["Docker", "Kubernetes", "Git", "GitLab CI", "Azure DevOps", "pnpm Monorepos"],
  },
  {
    label: "practices",
    title: "Practices",
    items: [
      "AI-Assisted Development (Claude Code, GitHub Copilot)",
      "Unit Testing (pytest, Vitest, Jest)",
      "Mocking",
      "Dependency Injection",
      "Linting (Ruff)",
      "Static Type Checking (ty)",
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
  summary:
    "Frontend-focused Full-Stack Engineer with 12+ years building modern web apps in TypeScript, specialising in Vue/Nuxt and React/Next.js. Currently shipping product frontends at Mercedes-Benz alongside the Python services behind them. Focused on type-safe, maintainable code, with an eye for detail in component design, accessibility, and performance.",
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
