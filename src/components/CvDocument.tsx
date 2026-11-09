import { For, Show } from "solid-js";
import { formatMonth, stripScheme } from "../lib/format";
import { CV_LAYOUT_STEPS } from "../data/cv-print-layout";
import { CvHead } from "./CvHead";
import { CvText } from "./CvText";
import type { PrintedCv } from "../lib/cv-variant";
import { Style } from "@solidjs/meta";
import styles from "./CvDocument.module.css";

function period(from: string, to?: string): string {
  return `${formatMonth(from)} – ${to === undefined || to === "" ? "Present" : formatMonth(to)}`;
}

/** Technology names, each whole, separated by dots that never start a line. */
function Tags(props: { items: string[]; class: string | undefined }) {
  return (
    <div class={[props.class, styles.cv__tags]}>
      <For each={props.items}>
        {(item) => (
          <span>
            <CvText text={item} />
          </span>
        )}
      </For>
    </div>
  );
}

function Experience(props: { entries: PrintedCv["experience"] }) {
  return (
    <section class={styles.cv__section}>
      <h2 class={styles["cv__section-title"]}>Professional Experience</h2>
      <For each={props.entries}>
        {(entry) => (
          <div class={[styles.cv__job, styles.cv__item]}>
            <div class={styles["cv__job-head"]}>
              <h3 class={styles["cv__item-title"]}>
                <CvText text={entry.title} />
              </h3>
              <div class={styles.cv__org}>
                <CvText text={entry.organization} />
                <Show when={entry.location}>
                  {(location) => (
                    <span class={styles.cv__location}>
                      {" · "}
                      <CvText text={location()} />
                    </span>
                  )}
                </Show>
                <span class={styles.cv__period}> · {period(entry.from, entry.to)}</span>
              </div>
              <Show when={entry.tech !== undefined && entry.tech.length > 0}>
                <Tags items={entry.tech ?? []} class={styles.cv__tech} />
              </Show>
            </div>
            <Show when={entry.bullets.length > 0}>
              <ul class={styles.cv__bullets}>
                <For each={entry.bullets}>
                  {(bullet) => (
                    <li>
                      <CvText text={bullet} />.
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        )}
      </For>
    </section>
  );
}

function Education(props: { entries: PrintedCv["education"] }) {
  return (
    <section class={styles.cv__section}>
      <h2 class={styles["cv__section-title"]}>Education</h2>
      <For each={props.entries}>
        {(entry) => (
          <div class={[styles.cv__entry, styles.cv__item]}>
            <h3 class={styles["cv__item-title"]}>
              <CvText text={entry.title} />
            </h3>
            <div class={styles.cv__org}>
              <CvText text={entry.organization} />
              <span class={styles.cv__period}> · {period(entry.from, entry.to)}</span>
            </div>
            <Show when={entry.bullets.length > 0}>
              <div class={styles.cv__details}>
                <CvText text={entry.bullets.join(" · ")} />
              </div>
            </Show>
          </div>
        )}
      </For>
    </section>
  );
}

function Projects(props: { projects: PrintedCv["projects"] }) {
  return (
    <section class={styles.cv__section}>
      <h2 class={styles["cv__section-title"]}>Projects</h2>
      <For each={props.projects}>
        {(project) => (
          <div class={[styles.cv__entry, styles.cv__item]}>
            <div class={styles["cv__item-row"]}>
              <h3 class={styles["cv__item-title"]}>
                <CvText text={project.title} />
              </h3>
              <Show when={project.url !== ""}>
                <a href={project.url} class={styles.cv__url}>
                  {stripScheme(project.url)}
                </a>
              </Show>
            </div>
            <Show when={project.description !== ""}>
              <div class={styles.cv__details}>
                <CvText text={project.description} />
              </div>
            </Show>
            <Show when={project.tech.length > 0}>
              <Tags items={project.tech} class={styles.cv__tech} />
            </Show>
          </div>
        )}
      </For>
    </section>
  );
}

/**
 * The printed CV for every variant. Variants change the content passed in
 * and pick layout steps; this template and its print styles are the one
 * design they all share.
 */
export function CvDocument(props: { cv: PrintedCv }) {
  // The layout steps reach the styles as two factors: --cv-space for the
  // vertical rhythm, --cv-scale for every type size (1 at the 13px the styles
  // are written for; the step is in pt, and 1pt is 4/3px).
  const layoutVars = () => ({
    "--cv-space": String(CV_LAYOUT_STEPS.spacing[props.cv.layout.spacing]),
    "--cv-scale": String((CV_LAYOUT_STEPS.textSize[props.cv.layout.textSize] * 4) / 3 / 13),
  });

  return (
    <article class="cv-paper" style={layoutVars()}>
      {/* Custom properties don't reach @page, so the margin is a rule of its own. */}
      <Style>{`@page { size: A4; margin: ${CV_LAYOUT_STEPS.margin[props.cv.layout.margin]}mm; }`}</Style>

      <CvHead profile={props.cv.profile}>
        <Show when={props.cv.summary}>
          {(summary) => (
            <p class={styles.cv__summary}>
              <CvText text={summary()} />
            </p>
          )}
        </Show>
        <Show when={props.cv.coreTechnologies.length > 0}>
          <p class={[styles.cv__core, styles.cv__tags]}>
            <For each={props.cv.coreTechnologies}>
              {(tech) => (
                <span>
                  <CvText text={tech} />
                </span>
              )}
            </For>
          </p>
        </Show>
      </CvHead>

      <Show when={props.cv.skills.length > 0}>
        <section class={styles.cv__section}>
          <h2 class={styles["cv__section-title"]}>Technical Skills</h2>
          <dl class={styles.cv__skills}>
            <For each={props.cv.skills}>
              {(group) => (
                <div class={styles.cv__skill}>
                  <dt>{group.title}</dt>
                  <dd>
                    <CvText text={group.items.join(", ")} />
                  </dd>
                </div>
              )}
            </For>
          </dl>
        </section>
      </Show>

      <Experience entries={props.cv.experience} />
      <Education entries={props.cv.education} />
      <Show when={props.cv.projects.length > 0}>
        <Projects projects={props.cv.projects} />
      </Show>
    </article>
  );
}
