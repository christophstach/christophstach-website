import { For, Show, createMemo } from "solid-js";
import { applicationName, isDue, isOpen, nextStepText, statusTone } from "../../../lib/application";
import {
  getDeskApplications,
  getDeskCollectors,
  getDeskContent,
  getDeskCoverLetters,
  getDeskCvs,
  getDeskJobSearch,
  getDeskPostings,
  getDeskProjects,
} from "../../../lib/desk/queries";
import { fitTone, isScoreDue } from "../../../lib/posting";
import type { JobPostingRecord } from "../../../data/postings";
import { letterStatus, pageStatus } from "../../../lib/cv-layout";
import { DeskContentPanel } from "../../../components/desk/DeskContentPanel";
import { DeskMeta } from "../../../components/desk/DeskMeta";
import type { RouteDefinition } from "@solidjs/router";
import { formatRelative } from "../../../lib/format";
import { paths } from "../../../router";
import { letterChecks, cvChecks } from "../../../lib/desk/page-checks";
import postingStyles from "../../../components/desk/page-postings.module.css";
import styles from "../../../components/desk/page-index.module.css";

const LATEST_LETTERS = 5;
const LATEST_APPLICATIONS = 5;
const TOP_POSTINGS = 5;

/** Postings still to decide on: not dismissed, not applied to. */
function isUndecided(posting: JobPostingRecord): boolean {
  return posting.status !== "dismissed" && posting.applicationId === "";
}

function isFresh(posting: JobPostingRecord): boolean {
  return posting.status === "new" && posting.applicationId === "";
}

/** The numbers that ask for something, each a link to where it is dealt with. */
function Figures() {
  const applications = createMemo(() => getDeskApplications());
  const postings = createMemo(() => getDeskPostings());
  const due = () => applications().filter((application) => isDue(application)).length;
  const running = () =>
    applications().filter((application) =>
      ["applied", "interviewing", "offer"].includes(application.status),
    ).length;
  const goodFits = () =>
    postings().filter((posting) => isUndecided(posting) && fitTone(posting) === "high").length;
  const fresh = () => postings().filter(isFresh).length;

  return (
    <div class={styles.figures}>
      <a
        href={paths.desk.applications()}
        class={[styles.figure, due() > 0 ? styles["figure--warn"] : undefined]}
      >
        <span class={styles.figure__value}>{due()}</span>
        <span class={styles.figure__label}>next steps due</span>
      </a>
      <a href={paths.desk.applications()} class={styles.figure}>
        <span class={styles.figure__value}>{running()}</span>
        <span class={styles.figure__label}>applications running</span>
      </a>
      <a href={paths.desk.postings()} class={styles.figure}>
        <span class={styles.figure__value}>{goodFits()}</span>
        <span class={styles.figure__label}>good fits to decide on</span>
      </a>
      <a href={paths.desk.postings()} class={styles.figure}>
        <span class={styles.figure__value}>{fresh()}</span>
        <span class={styles.figure__label}>new postings</span>
      </a>
    </div>
  );
}

function PostingsPanel() {
  const postings = createMemo(() => getDeskPostings());
  const search = createMemo(() => getDeskJobSearch());
  const collectors = createMemo(() => getDeskCollectors());
  const fresh = () => postings().filter(isFresh).length;
  const dueForScore = () =>
    postings().filter((posting) => isScoreDue(posting, search().updatedAt)).length;
  // The best fits still to decide on, newest first among equals.
  const best = () =>
    postings()
      .filter((posting) => isUndecided(posting) && posting.score !== null)
      .toSorted(
        (first, second) =>
          (second.score?.score ?? 0) - (first.score?.score ?? 0) ||
          second.createdAt.localeCompare(first.createdAt),
      )
      .slice(0, TOP_POSTINGS);
  const failing = () =>
    collectors().filter((collector) => collector.active && collector.lastError !== "");

  return (
    <section class="panel" aria-labelledby="panel-postings">
      <header class="panel__head">
        <h2 id="panel-postings" class="panel__title">
          postings
        </h2>
        <a href={paths.desk.postings()} class={["text-link panel__end", styles["add-link"]]}>
          All {postings().length} postings
        </a>
        <a href={paths.desk.postings.scoring()} class={["text-link", styles["add-link"]]}>
          Scoring
        </a>
      </header>

      <For each={failing()}>
        {(collector) => (
          <p class={styles.warning} role="alert">
            <a href={paths.desk.collectors(collector.id)} class="text-link">
              {collector.label}
            </a>{" "}
            failed on its last run: {collector.lastError}
          </p>
        )}
      </For>

      <Show when={fresh() > 0 || dueForScore() > 0}>
        <p class={styles.notice}>
          <a href={paths.desk.postings()} class="text-link">
            {fresh()} new {fresh() === 1 ? "posting" : "postings"}
          </a>{" "}
          to sort out · {dueForScore()} due for scoring
        </p>
      </Show>

      <Show when={best().length > 0} fallback={<p class="panel__empty">No scored postings yet.</p>}>
        <ul class="panel__rows">
          <For each={best()}>
            {(posting) => (
              <li>
                <a href={paths.desk.postings(posting.id)} class={["panel-row", styles.row]}>
                  <span class={styles.row__main}>
                    <span
                      class={[
                        postingStyles.fit,
                        postingStyles[`fit--${fitTone(posting)}`],
                        posting.description === "" ? postingStyles["fit--guess"] : undefined,
                      ]}
                    >
                      {posting.score?.score}
                    </span>
                    <span class="panel-row__label">{posting.title}</span>
                  </span>
                  <span class="panel-row__meta">{posting.company}</span>
                  <span class="panel-row__meta">{posting.location}</span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}

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
    void getDeskPostings();
    void getDeskJobSearch();
    void getDeskCollectors();
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
          <p class="desk-head__sub">
            What's due, which jobs fit, what the CVs are built from, and how they print.
          </p>
        </div>
      </header>

      <Figures />

      <div class="panels">
        <ApplicationsPanel />
        <PostingsPanel />
        <DeskContentPanel />
        <CvsPanel />
        <LettersPanel />
      </div>
    </div>
  );
}
