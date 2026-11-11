import { For, Show } from "solid-js";
import { CvText } from "../CvText";
import type { CvWebsiteProject } from "../../data/public-api";
import styles from "./curriculum.module.css";

/** The website CV's projects as cards. */
export function CurriculumProjects(props: { projects: CvWebsiteProject[] }) {
  return (
    <section class={[styles.projects, "reveal--scroll"]}>
      <h2 class={["section-label", styles["page__section-label"]]}>projects</h2>

      <ul class={styles.projects__grid}>
        <For each={props.projects}>
          {(project) => (
            <li class={styles.projects__card}>
              <h3 class={styles.projects__title}>
                <span class={styles.projects__prompt}>›</span>
                <Show when={project.url !== ""} fallback={<CvText text={project.title} />}>
                  <a
                    href={project.url}
                    class={styles.projects__link}
                    target="_blank"
                    rel="noopener"
                  >
                    {project.title}
                  </a>
                </Show>
              </h3>

              <p class={styles.projects__description}>
                <CvText text={project.description} />
              </p>

              <ul class={styles.projects__tech} aria-label="Technologies">
                <For each={project.tech}>
                  {(tech) => (
                    <li class="chip chip--accent">
                      <CvText text={tech} />
                    </li>
                  )}
                </For>
              </ul>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
