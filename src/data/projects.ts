export interface Project {
  title: string
  description: string
  tags?: string[]
  repository?: string
  website?: string
}

const projects: Project[] = [
  {
    title: 'Crowds UI',
    description: `
      At Dericon GmbH, my latest project involves developing a responsive, intuitive workflow editor featuring a specialized view that displays tasks from the backend as a graph. The UI converts tasks into nodes and edges, and an auto-layout function optimizes their positions. Additionally, the project incorporates dynamic form generation based on backend-provided structures.
    `,
    tags: ['TypeScript', 'React', 'Remix.run', 'TailwindCSS', 'DaisyUI', 'reactflow', 'react-hook-form'],
    // website: "https://christophstach.me",
    // repository: "https://github.com/christophstach/christophstach-website",
  },
  {
    title: 'This website',
    description: `
      Introducing a revamped version of my personal website, designed to exude a contemporary and invigorating atmosphere. The previous iteration relied on Angular and Bootstrap, but this edition employs cutting-edge technologies for an enhanced user experience. Featuring server-side rendering and the innovative SolidStart metaframework, the site now also offers a sleek dark mode option.
    `,
    tags: ['TypeScript', 'SolidJS', 'SolidStart', 'TailwindCSS'],
    website: 'https://christophstach.me',
    repository: 'https://github.com/christophstach/christophstach-website',
  },
  {
    title: 'Finance Check',
    description: `
      This web application presents an interactive questionnaire featuring a variety of categories. Each category contains a finite number of questions accompanied by their respective answers. The questionnaire supports both standard and multiple-choice questions. Upon completing each category, the user is prompted to decide whether they wish to proceed with any remaining categories. All responses are stored and ultimately transmitted to a backend service for further analysis. I designed this tool to cater to the requirements of a friend who operates a financial consulting website, <a href="https://andreasjansen.com/">andreasjansen.com</a>.
    `,
    tags: ['TypeScript', 'React', 'Jotai', 'TailwindCSS'],
    website: 'https://andreasjansen.com/finanzcheck-starten',
    repository: 'https://github.com/christophstach/jansen-quiz-react',
  },
  {
    title: 'Covid SpiNGS - Realtime Variant Caller',
    description: `
      Introducing a cutting-edge variant caller for next-generation sequencing, designed to analyze incoming BAM files in real-time. This sophisticated tool efficiently stores intermediate results in memory, and upon user request, seamlessly calculates vital statistics. Developed in the Kotlin programming language, the variant caller harnesses the capabilities of the JVM platform.
    `,
    tags: ['Kotlin', 'Java', 'JVM', 'NGS', 'SAMtools', 'htsjdk'],
    website: 'https://www.htw-berlin.de/forschung/online-forschungskatalog/projekte/projekt/?eid=3100',
    repository: 'https://github.com/COVID-SpiNGS/realtime-variant-caller',
  },
  {
    title: 'Covid SpiNGS - Realtime pipeline',
    description: `
      The Nextflow pipeline employs Nextflow to process data by monitoring a designated folder for incoming fastq files. These files are subsequently aligned to a reference sequence using <a href="https://github.com/lh3/minimap2">minimap2</a>. The results from various files are collected, combined, and then passed to the variant caller, <a href="https://github.com/kishwarshafin/pepper">PEPPER-Margin-DeepVariant</a>, which generates the final VCF outcome.
    `,
    tags: ['Nextflow', 'NGS', 'SAMtools', 'Minimap2', 'DeepVariant'],
    website: 'https://www.htw-berlin.de/forschung/online-forschungskatalog/projekte/projekt/?eid=3100',
    repository: 'https://github.com/COVID-SpiNGS/covid-spings-pipeline',
  },
]

export default projects
