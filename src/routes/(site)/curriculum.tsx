import { CV_PDF_PATH } from "../../data/endpoints";
import { IconBriefcase, IconDownload, IconSchool } from "../../components/icons";
import { CurriculumProjects } from "../../components/curriculum/CurriculumProjects";
import { CvTimeline } from "../../components/CvTimeline";
import { cvDownloadVisible } from "../../data/cvs";
import styles from "../../components/curriculum/curriculum.module.css";

// A server page: experience, education and projects come directly from the
// website CV in Postgres; the rendered page is cached at the edge (ISR) until
// the desk changes the CV or its content.
export default async function Curriculum() {
  "use server";

  // Imported here, inside the server function, so the client build never
  // resolves the server-only modules or Effect runtime.
  const [{ Effect }, { printStoredCvEffect, requireMarkedCvEffect }, { runServerEffect }] =
    await Promise.all([
      import("effect"),
      import("../../server/cvs"),
      import("../../server/effect"),
    ]);
  const cv = await runServerEffect(
    Effect.gen(function* () {
      const marked = yield* requireMarkedCvEffect("isWebsite");

      return yield* printStoredCvEffect(marked);
    }),
  );

  return () => (
    <div class={["container", styles.page]}>
      <p class={[styles.page__kicker, "reveal"]}>
        <span class={styles.terminal__prompt} aria-hidden="true">
          $
        </span>{" "}
        cat curriculum.md
      </p>

      <h1 class={styles.page__title}>Curriculum</h1>

      <p class={[styles.page__intro, "reveal"]} style={{ "animation-delay": "100ms" }}>
        A concise overview of my professional experience and education: over a decade of full-stack
        engineering with Vue/Nuxt, React/Next.js, and NestJS, more recently extending into Python
        for AI and LLM agents at MBition (Mercedes-Benz), and a B.Sc. and M.Sc. in Applied Computer
        Science focused on AI, bioinformatics, deep learning, and data science.
      </p>

      {cvDownloadVisible && (
        <div class={[styles.page__actions, "reveal"]} style={{ "animation-delay": "160ms" }}>
          <a href={CV_PDF_PATH} download class="button button--primary">
            <IconDownload size={16} />
            Download CV (PDF)
          </a>
        </div>
      )}

      <div class={[styles.page__columns, "reveal--scroll"]}>
        <section>
          <h2 class={["section-label", styles["page__section-label"]]}>experience</h2>
          <CvTimeline entries={cv.experience} icon={IconBriefcase} />
        </section>

        <section>
          <h2 class={["section-label", styles["page__section-label"]]}>education</h2>
          <CvTimeline entries={cv.education} icon={IconSchool} />
        </section>
      </div>

      {cv.projects.length > 0 && <CurriculumProjects projects={cv.projects} />}
    </div>
  );
}
