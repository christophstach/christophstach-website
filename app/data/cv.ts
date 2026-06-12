export interface TimelineLink {
  text: string;
  href: string;
}

export interface TimelineEntry {
  title: string;
  organization: string;
  from: string;
  to?: string;
  tech?: string[];
  bullets: string[];
  links?: TimelineLink[];
}

export const experience: TimelineEntry[] = [
  {
    title: "Senior Full Stack Engineer",
    organization: "MBition GmbH (Mercedes-Benz)",
    from: "2023-10",
    tech: ["Vue", "Nuxt", "TypeScript", "NestJS", "PostgreSQL", "MongoDB", "Azure DevOps"],
    bullets: [
      "Shipped end-to-end features across Nuxt and NestJS: designed REST contracts, integrated APIs, and built reusable UI components",
      "Enforced strict TypeScript and ESLint, significantly reducing runtime errors",
      "Consolidated multiple products into a pnpm monorepo, cutting build times by ~50% and enabling end-to-end type-safety and better DX",
      "Standardized Azure DevOps CI/CD (lint → test → build → release), improving deployment success rates and release traceability",
      "Implemented a Role-Based Access Control (RBAC) system using CASL.js",
    ],
  },
  {
    title: "Frontend Engineer",
    organization: "DERICON GmbH",
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
    from: "2011-10",
    to: "2014-11",
    tech: ["JavaScript", "ExtJS", "REST", "PHP", "Symfony", "MySQL"],
    bullets: [
      "Modernized a legacy frameset-based PHP/HTML/CSS/JS application into a modular frontend/backend architecture, rebuilding the UI with ExtJS and establishing a clean PHP backend to improve maintainability and feature velocity",
      "Collaborated with stakeholders to prioritize requirements, deliver new features, and resolve defects quickly",
    ],
  },
  {
    title: "Full Stack Developer",
    organization: "CREAVIVA GmbH & Co. KG",
    from: "2011-07",
    to: "2011-10",
    tech: ["PHP", "MySQL", "CSS", "JavaScript", "TYPO3"],
    bullets: [
      "Managed and created content for websites using PHP, MySQL, CSS, and JavaScript",
      "Developed websites with TYPO3 CMS, including custom TYPO3 extension creation",
    ],
  },
  {
    title: "IT Management Assistant",
    organization: "Kortmann Beton GmbH & Co. KG",
    from: "2009-07",
    to: "2011-07",
    bullets: ["Developed and maintained the company website"],
  },
];

export const education: TimelineEntry[] = [
  {
    title: "M.Sc. Applied Computer Science",
    organization: "HTW Berlin",
    from: "2019-12",
    to: "2023-10",
    bullets: [
      "Thesis: Explorative Analysis of Data from Nanopore-Based DNA Sequencing to Identify Dilution Effects — Grade: 1.1",
      "Specialisations: AI, Bioinformatics, Deep Learning, Data Science",
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
      "Thesis: Style transfer for photos using deep learning — Grade: 1.6",
      "Exchange: UNINTER, Cuernavaca, Mexico",
    ],
  },
  {
    title: "IT Management Assistant (Apprenticeship)",
    organization: "Kortmann Beton GmbH & Co. KG",
    from: "2009-07",
    to: "2011-07",
    bullets: ["Completed apprenticeship alongside theoretical studies — Grade: 2.0"],
  },
  {
    title: "Information Technology Assistant",
    organization: "Berufskolleg Rheine",
    from: "2004-09",
    to: "2008-07",
    bullets: [
      "Dual degree in Information Technology, covering programming, database management, and more, including university eligibility — Grade: 2.9",
    ],
  },
];
