export interface Project {
  title: string
  description: string
  tags?: string[]
  repository?: string
  website?: string
}

const projects: Project[] = [
  {
    title: "This website",
    description: `
      This website is a rework of my own personal website. The former website was based on Angular and Bootstrap.
      I wanted to give it a new, fresh feeling and chose the most modern technologies to develop it. This website
      is server side rendered and uses the metaframework SolidStart. It also supports a darkmode.
    `,
    tags: ["TypeScript", "SolidJS", "SolidStart", "TailwindCSS"],
    website: "https://christophstach.me",
    repository: "https://github.com/christophstach/christophstach-website",
  },
  {
    title: "Finance Check",
    description: `
      This web-application renders a questionary. It supports multiple categories. Each category can have a finite number of questions wich answers.
      It supports normal and multiple choice questions. In the end of each category the user is promoted if he wants to continue wich a remaining
      category. All answers are saved and in the end send to a backend service for further processing. I developed this tool for the needs of a friend, 
      who is running the finance consulting website <a href="https://andreasjansen.com/">andreasjansen.com</a>.
    `,
    tags: ["TypeScript", "React", "Jotai", "TailwindCSS"],
    website: "https://andreasjansen.com/finanzcheck-starten",
    repository: "https://github.com/christophstach/jansen-quiz-react",
  },
  {
    title: "Covid SpiNGS - Realtime Variant Caller",
    description: `
      A next generation sequencing variant caller which can analyse incoming bam files in realtime. 
      It saves itermediate results in memory and calculates statistics on user demand.
      The variant caller is written in the programming language kotling to utilize the performance of the JVM platform.
    `,
    tags: ["Kotlin", "Java", "JVM", "NGS", "SAMtools", "htsjdk"],
    website: "https://www.htw-berlin.de/forschung/online-forschungskatalog/projekte/projekt/?eid=3100",
    repository: "https://github.com/COVID-SpiNGS/realtime-variant-caller",
  },
  {
    title: "Covid SpiNGS - Realtime pipeline",
    description: `
    This Nextflow pipeline uses nextflow to analyse data. It observes a folder in the filesystem for incoming fastq files.
    These are then aligned to a reference sequence by <a href="https://github.com/lh3/minimap2">minimap2</a>. The results of multiple files are gathered,
    merged and then forwarded to the variant caller <a href="https://github.com/kishwarshafin/pepper">PEPPER-Margin-DeepVariant</a>, 
    which produces the final VCF result.
    `,
    tags: ["Nextflow", "NGS", "SAMtools", "Minimap2", "DeepVariant"],
    website: "https://www.htw-berlin.de/forschung/online-forschungskatalog/projekte/projekt/?eid=3100",
    repository: "https://github.com/COVID-SpiNGS/covid-spings-pipeline",
  },
]

export default projects
