import { For, Show, createMemo } from "solid-js";
import { applicationName, isDue, isOpen, nextStepText, statusTone } from "../../../lib/application";
import {
  getDeskApplications,
  getDeskContent,
  getDeskCoverLetters,
  getDeskCvs,
  getDeskProjects,
} from "../../../lib/desk/queries";
import { letterStatus, pageStatus } from "../../../lib/cv-layout";
import { DeskContentPanel } from "../../../components/desk/DeskContentPanel";
import { DeskMeta } from "../../../components/desk/DeskMeta";
import type { RouteDefinition } from "@solidjs/router";
import { formatRelative } from "../../../lib/format";
import { paths } from "../../../router";
import { letterChecks, cvChecks } from "../../../lib/desk/page-checks";
import styles from "../../../components/desk/page-index.module.css";

const LATEST_LETTERS = 5;
const LATEST_APPLICATIONS = 5;

function cvStatus(cv: { id: string; pageFills: number[] }) {
  return cvChecks.running().includes(cv.id)
    ? { tone: "none" as const, text: "checking pages…" }
    : pageStatus(cv.pageFills);
}

function letterRowStatus(letter: { id: string; pageFills: number[] }) {
  return letterChecks.running().includes(letter.id)
    ? { tone: "none" as const, text: "checking pages…" }
    : letterStatus(letter.pageFills);
}

function CvsPanel() {
  const data = createMemo(() => getDeskCvs());
  const isPublic = (id: string) => id === data().primaryId || id === data().websiteId;

  // The public CVs first, then the most recently edited.
  const cvs = () =>
    data().cvs.toSorted(
      (first, second) =>
        Number(isPublic(second.id)) - Number(isPublic(first.id)) ||
        second.updatedAt.localeCompare(first.updatedAt),
    );

  return (
    <section class="panel" aria-labelledby="panel-cvs">
      <header class="panel__head">
        <h2 id="panel-cvs" class="panel__title">
          cvs
        </h2>
        <a href={paths.desk.cvs({ new: "1" })} class={["text-link panel__end", styles["add-link"]]}>
          New CV
        </a>
      </header>

      <Show when={cvs().length > 0} fallback={<p class="panel__empty">No CVs yet.</p>}>
        <ul class="panel__rows">
          <For each={cvs()}>
            {(cv) => (
              <li>
                <a href={paths.desk.cvs(cv.id)} class={["panel-row", styles.row]}>
                  <span class={styles.row__main}>
                    <span class="panel-row__label">{cv.label}</span>
                    <Show when={cv.id === data().primaryId}>
                      <span class={"role-tag"}>PDF</span>
                    </Show>
                    <Show when={cv.id === data().websiteId}>
                      <span class={"role-tag"}>/curriculum</span>
                    </Show>
                  </span>
                  <span class="panel-row__meta">
                    <span class={`desk-status desk-status--${cvStatus(cv).tone}`}>
                      {cvStatus(cv).text}
                    </span>
                  </span>
                  <span class="panel-row__meta">{formatRelative(cv.updatedAt)}</span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}

function ApplicationsPanel() {
  const applications = createMemo(() => getDeskApplications());
  const open = () => applications().filter((application) => isOpen(application.status));

  // Due first, then by the next step's date (undated last), then the newest.
  const shown = () =>
    open()
      .toSorted(
        (first, second) =>
          Number(isDue(second)) - Number(isDue(first)) ||
          (first.nextStepOn || "9999").localeCompare(second.nextStepOn || "9999") ||
          second.updatedAt.localeCompare(first.updatedAt),
      )
      .slice(0, LATEST_APPLICATIONS);
  const hasMore = () => applications().length > shown().length;

  return (
    <section class="panel" aria-labelledby="panel-applications">
      <header class="panel__head">
        <h2 id="panel-applications" class="panel__title">
          applications
        </h2>
        <Show when={hasMore()}>
          <a href={paths.desk.applications()} class={["text-link panel__end", styles["add-link"]]}>
            All {applications().length} applications
          </a>
        </Show>
        <a
          href={paths.desk.applications({ new: "1" })}
          class={["text-link", styles["add-link"], { panel__end: !hasMore() }]}
        >
          New application
        </a>
      </header>

      <Show when={shown().length > 0} fallback={<p class="panel__empty">No open applications.</p>}>
        <ul class="panel__rows">
          <For each={shown()}>
            {(application) => (
              <li>
                <a href={paths.desk.applications(application.id)} class={["panel-row", styles.row]}>
                  <span class={styles.row__main}>
                    <span class="panel-row__label">{applicationName(application)}</span>
                  </span>
                  <span class="panel-row__meta">
                    <Show
                      when={isDue(application)}
                      fallback={
                        <span
                          class={`desk-status desk-status--${statusTone(application.status).tone}`}
                        >
                          {statusTone(application.status).text}
                        </span>
                      }
                    >
                      <span class="desk-status desk-status--warn">due</span>
                    </Show>
                  </span>
                  <span class="panel-row__meta">{nextStepText(application)}</span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}

function LettersPanel() {
  const letters = createMemo(() => getDeskCoverLetters());
  const latest = () => letters().slice(0, LATEST_LETTERS);
  const hasMore = () => letters().length > latest().length;

  return (
    <section class="panel" aria-labelledby="panel-letters">
      <header class="panel__head">
        <h2 id="panel-letters" class="panel__title">
          cover letters
        </h2>
        <Show when={hasMore()}>
          <a
            href={paths.desk["cover-letters"]()}
            class={["text-link panel__end", styles["add-link"]]}
          >
            All {letters().length} letters
          </a>
        </Show>
        <a
          href={paths.desk["cover-letters"]({ new: "1" })}
          class={["text-link", styles["add-link"], { panel__end: !hasMore() }]}
        >
          New letter
        </a>
      </header>

      <Show
        when={letters().length > 0}
        fallback={<p class="panel__empty">No cover letters yet.</p>}
      >
        <ul class="panel__rows">
          <For each={latest()}>
            {(letter) => (
              <li>
                <a href={paths.desk["cover-letters"](letter.id)} class={["panel-row", styles.row]}>
                  <span class={styles.row__main}>
                    <span class="panel-row__label">{letter.label}</span>
                  </span>
                  <span class="panel-row__meta">
                    <span class={`desk-status desk-status--${letterRowStatus(letter).tone}`}>
                      {letterRowStatus(letter).text}
                    </span>
                  </span>
                  <span class="panel-row__meta">
                    {letter.application.jobTitle || letter.application.company}
                  </span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}

export const route = {
  preload: () => {
    void getDeskApplications();
    void getDeskCvs();
    void getDeskCoverLetters();
    void getDeskContent();
    void getDeskProjects();
  },
} satisfies RouteDefinition;

export default function DeskOverview() {
  return (
    <div class="desk-page">
      <DeskMeta title="Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk</p>
          <h1 class="desk-head__title">Overview</h1>
          <p class="desk-head__sub">What's due, what the CVs are built from, and how they print.</p>
        </div>
      </header>

      <div class="panels">
        <ApplicationsPanel />
        <DeskContentPanel />
        <CvsPanel />
        <LettersPanel />
      </div>
    </div>
  );
}
