import styles from "./home.module.css";

/** What Christoph works on and has worked on, in prose. */
export function HomeAbout() {
  return (
    <section class={[styles.about, "reveal--scroll"]}>
      <h2 class="section-label">about</h2>

      <div class={styles.about__content}>
        <p>
          At <strong>MBition (Mercedes-Benz)</strong>, I work as a Senior Software Engineer and own
          the <strong>Python</strong> platform on which multiple Mercedes-Benz teams build and run
          their LLM agents on <strong>Kubernetes</strong>. Its service is the cloud backend for the
          in-car voice assistant serving several million vehicles. I re-architected it to fully
          asynchronous Python, which cut its memory use by 50%, and rebuilt the CI/CD pipelines,
          which took deployment from a ~2-hour manual process to an automated 15 minutes.
        </p>

        <p>
          Before that, on the company's speech platform, I built a no-code platform for configuring
          and deploying speech applications, shipping features end-to-end in{" "}
          <strong>Vue and Nuxt</strong> with strict <strong>TypeScript</strong>. I owned code
          quality across the team and cut build times by ~50% by consolidating multiple products
          into a pnpm monorepo.
        </p>

        <p>
          Earlier, alongside my studies at DERICON, I built and owned a graph-based no-code workflow
          builder in <strong>React and Remix</strong>. At SLH, I modernized a legacy PHP application
          into a modular frontend/backend architecture.
        </p>

        <p>
          I hold a <strong>B.Sc.</strong> and an <strong>M.Sc. in Applied Computer Science</strong>{" "}
          from{" "}
          <a href="https://www.htw-berlin.de/" target="_blank" rel="noopener" class="text-link">
            HTW Berlin
          </a>
          , specializing in data science and health computing, with theses on style transfer for
          low-power hardware and nanopore-based DNA sequencing.
        </p>
      </div>
    </section>
  );
}
