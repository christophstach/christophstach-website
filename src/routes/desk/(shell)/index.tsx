import { For, Show, createMemo } from "solid-js";
import {
  applicationName,
  isDue,
  isOpen,
  nextStepText,
  statusTone,
  today,
} from "../../../lib/application";
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
import { FREE_SCORES_PER_DAY, fitTone, isScoreDue, scoredToday } from "../../../lib/posting";
import { settleDeskNextStep } from "../../../lib/desk/applications";
import { useDeskRequest } from "../../../lib/desk/request";
import type { JobPostingRecord } from "../../../data/postings";
import type { ApplicationStatus } from "../../../data/applications";
import { STATUS_LABELS } from "../../../data/applications";
import { DeskStats } from "../../../components/desk/DeskStats";
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

/** The days the activity panel looks back. */
const ACTIVITY_DAYS = 7;
/** How long a sent application may wait for a reply before it asks for a nudge. */
const QUIET_DAYS = 14;

/** The ISO timestamp `days` ago; its first ten characters are the day. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Where the applications stand, a cell per status, and how many have replied. */
function PipelinePanel() {
  const applications = createMemo(() => getDeskApplications());
  const count = (status: ApplicationStatus) =>
    applications().filter((application) => application.status === status).length;
  const stages: ApplicationStatus[] = ["preparing", "applied", "interviewing", "offer", "rejected"];
  const sent = () => applications().filter((application) => application.status !== "preparing");
  const replied = () =>
    sent().filter((application) =>
      ["interviewing", "offer", "accepted", "rejected"].includes(application.status),
    ).length;
  // Sent a while ago, nothing heard and no step planned: worth a nudge.
  const quiet = () =>
    applications().filter(
      (application) =>
        application.status === "applied" &&
        application.appliedOn !== "" &&
        application.appliedOn <= daysAgo(QUIET_DAYS).slice(0, 10) &&
        application.nextStepOn === "",
    ).length;

  return (
    <section class="panel" aria-labelledby="panel-pipeline">
      <header class="panel__head">
        <h2 id="panel-pipeline" class="panel__title">
          pipeline
        </h2>
      </header>

      <DeskStats
        stats={stages.map((status) => ({
          to: paths.desk.applications({ status }),
          label: STATUS_LABELS[status].toLocaleLowerCase("en"),
          count: count(status),
        }))}
      />

      <Show when={sent().length > 0}>
        <p class={styles.foot}>
          {replied()} of {sent().length} sent replied (
          {Math.round((replied() / sent().length) * 100)}%)
          <Show when={quiet() > 0}>{` · ${quiet()} without a reply for ${QUIET_DAYS}+ days`}</Show>
        </p>
      </Show>
    </section>
  );
}

/**
 * The next steps due today or overdue, each settled right here: "Done" moves
 * it into the application's history, "+3 days" moves it on.
 */
function TodayPanel() {
  const applications = createMemo(() => getDeskApplications());
  const request = useDeskRequest();
  const due = () =>
    applications()
      .filter((application) => isDue(application))
      .toSorted((first, second) => first.nextStepOn.localeCompare(second.nextStepOn));

  function settle(id: string, action: "done" | "later") {
    void request.run(() => settleDeskNextStep(id, { action, today: today() }));
  }

  return (
    <section class="panel" aria-labelledby="panel-today">
      <header class="panel__head">
        <h2 id="panel-today" class="panel__title">
          today
        </h2>
      </header>

      <Show when={request.error() !== ""}>
        <p class={styles.warning} role="alert">
          {request.error()}
        </p>
      </Show>

      <Show when={due().length > 0} fallback={<p class="panel__empty">Nothing due today.</p>}>
        <ul class="panel__rows">
          <For each={due()}>
            {(application) => (
              <li class={styles.task}>
                <a href={paths.desk.applications(application.id)} class={styles.task__main}>
                  <span class="panel-row__label">{applicationName(application)}</span>
                  <span class="panel-row__meta">{nextStepText(application)}</span>
                </a>
                <span class={styles.task__actions}>
                  <button
                    type="button"
                    class={["button button--outline", styles.action]}
                    disabled={request.busy()}
                    onClick={() => settle(application.id, "done")}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    class={["button button--outline", styles.action]}
                    disabled={request.busy()}
                    onClick={() => settle(application.id, "later")}
                  >
                    +3 days
                  </button>
                </span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}

/**
 * How far the applications got, from prepared to an offer: each stage holds
 * the next, so the bars only narrow. The share is of the stage before.
 */
function FunnelPanel() {
  const applications = createMemo(() => getDeskApplications());
  const reached = (statuses: ApplicationStatus[]) =>
    applications().filter((application) => statuses.includes(application.status)).length;
  const stages = () => {
    const counts = [
      { label: "prepared", count: applications().length, good: false },
      {
        label: "sent",
        count: applications().filter((application) => application.status !== "preparing").length,
        good: false,
      },
      {
        label: "replied",
        count: reached(["interviewing", "offer", "accepted", "rejected"]),
        good: false,
      },
      { label: "interviews", count: reached(["interviewing", "offer", "accepted"]), good: false },
      // An offer is good news: the one bar in the accent.
      { label: "offers", count: reached(["offer", "accepted"]), good: true },
    ];
    const most = Math.max(1, counts[0]?.count ?? 0);

    return counts.map((stage, index) => {
      const before = counts[index - 1]?.count ?? 0;

      return {
        label: stage.label,
        count: stage.count,
        good: stage.good,
        width: `${(stage.count / most) * 100}%`,
        share: index === 0 || before === 0 ? "" : `${Math.round((stage.count / before) * 100)}%`,
      };
    });
  };

  return (
    <section class="panel" aria-labelledby="panel-funnel">
      <header class="panel__head">
        <h2 id="panel-funnel" class="panel__title">
          funnel
        </h2>
      </header>

      <ol class={styles.funnel}>
        <For each={stages()}>
          {(stage) => (
            <li class={styles.funnel__stage}>
              <span class={styles.funnel__label}>{stage.label}</span>
              <span class={styles.funnel__track} aria-hidden="true">
                <span
                  class={[styles.funnel__bar, stage.good ? styles["funnel__bar--good"] : undefined]}
                  style={{ width: stage.width }}
                />
              </span>
              <span class={styles.funnel__count}>{String(stage.count)}</span>
              <span class={styles.funnel__share}>{stage.share}</span>
            </li>
          )}
        </For>
      </ol>
    </section>
  );
}

/** The weeks the postings chart shows, this one last. */
const CHART_WEEKS = 12;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-09" → "9 Nov": the same on server and client, unlike Intl's "Sept". */
function weekLabel(day: string): string {
  return `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1] ?? ""}`;
}

/** The Monday (UTC) of the week an ISO timestamp falls in, as an ISO day. */
function weekOf(iso: string): string {
  const date = new Date(iso);

  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));

  return date.toISOString().slice(0, 10);
}

/** Postings found per week, and which collectors brought them. */
function WeeklyPanel() {
  const postings = createMemo(() => getDeskPostings());
  const collectors = createMemo(() => getDeskCollectors());
  const weeks = createMemo(() => {
    const thisWeek = weekOf(new Date().toISOString());
    const days = Array.from({ length: CHART_WEEKS }, (_, index) =>
      weekOf(
        new Date(Date.parse(thisWeek) - (CHART_WEEKS - 1 - index) * 7 * 86_400_000).toISOString(),
      ),
    );
    const counts = new Map(days.map((day) => [day, 0]));

    for (const posting of postings()) {
      const week = weekOf(posting.createdAt);
      const count = counts.get(week);

      if (count !== undefined) {
        counts.set(week, count + 1);
      }
    }

    const most = Math.max(1, ...counts.values());

    return days.map((day, index) => {
      const count = counts.get(day) ?? 0;

      return {
        day,
        count,
        label: weekLabel(day),
        current: index === days.length - 1,
        height: `${(count / most) * 100}%`,
      };
    });
  });
  const total = () => weeks().reduce((sum, week) => sum + week.count, 0);
  // The collectors' shares over the chart's weeks, most first.
  const sources = () => {
    const since = weeks()[0]?.day ?? "";
    const byCollector = new Map<string, number>();

    for (const posting of postings()) {
      if (weekOf(posting.createdAt) >= since) {
        byCollector.set(posting.collectorId, (byCollector.get(posting.collectorId) ?? 0) + 1);
      }
    }

    return Array.from(byCollector, ([id, count]) => ({
      id,
      label:
        collectors().find((collector) => collector.id === id)?.label ??
        (id === "" ? "added by hand" : id),
      count,
    })).toSorted((first, second) => second.count - first.count);
  };

  return (
    <section class="panel" aria-labelledby="panel-weekly">
      <header class="panel__head">
        <h2 id="panel-weekly" class="panel__title">
          postings per week
        </h2>
        <span class={["panel__end", styles.chart__total]}>
          {`${total()} in ${CHART_WEEKS} weeks`}
        </span>
      </header>

      <div class={styles.chart}>
        <ol class={styles.chart__bars}>
          <For each={weeks()}>
            {(week) => (
              <li
                class={[
                  styles.chart__week,
                  week.current ? styles["chart__week--current"] : undefined,
                ]}
                style={{ "--bar": week.height }}
                aria-label={`Week of ${week.label}: ${week.count} ${week.count === 1 ? "posting" : "postings"}`}
              >
                <span class={styles.chart__value} aria-hidden="true">
                  {String(week.count)}
                </span>
                <span class={styles.chart__bar} aria-hidden="true" />
                <span class={styles.chart__label} aria-hidden="true">
                  {week.current ? "this week" : week.label}
                </span>
              </li>
            )}
          </For>
        </ol>
      </div>

      <Show when={sources().length > 0}>
        <p class={styles.foot}>
          {sources()
            .map((source) => `${source.label} ${source.count}`)
            .join(" · ")}
        </p>
      </Show>
    </section>
  );
}

/** What happened in the last days: found, scored, sent, written down. */
function ActivityPanel() {
  const applications = createMemo(() => getDeskApplications());
  const postings = createMemo(() => getDeskPostings());
  const since = daysAgo(ACTIVITY_DAYS);
  const sinceDay = since.slice(0, 10);

  const stats = () => [
    {
      to: paths.desk.postings(),
      label: "postings found",
      count: postings().filter((posting) => posting.createdAt >= since).length,
    },
    {
      to: paths.desk.postings.scoring(),
      label: "scored",
      count: postings().filter((posting) => (posting.score?.scoredAt ?? "") >= since).length,
    },
    {
      to: paths.desk.postings.scoring(),
      label: "ad texts found",
      count: postings().filter(
        (posting) => posting.adTextUrl !== "" && posting.adTextCheckedAt >= since,
      ).length,
    },
    {
      to: paths.desk.applications(),
      label: "applications sent",
      count: applications().filter((application) => application.appliedOn >= sinceDay).length,
    },
    {
      to: paths.desk.applications(),
      label: "history steps",
      count: applications().reduce(
        (sum, application) =>
          sum + application.events.filter((event) => event.date >= sinceDay).length,
        0,
      ),
    },
  ];

  return (
    <section class="panel" aria-labelledby="panel-activity">
      <header class="panel__head">
        <h2 id="panel-activity" class="panel__title">
          {/* One string: a constant between text renders differently on server and client. */}
          {`last ${ACTIVITY_DAYS} days`}
        </h2>
      </header>

      <DeskStats stats={stats()} />
    </section>
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

      <p class={styles.notice}>
        <a href={paths.desk.postings()} class="text-link">
          {fresh()} new {fresh() === 1 ? "posting" : "postings"}
        </a>{" "}
        to sort out · {dueForScore()} due for scoring ·{" "}
        {`${scoredToday(postings())} of ${FREE_SCORES_PER_DAY} free scores used today`}
      </p>

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
        <TodayPanel />
        <ApplicationsPanel />
        <PipelinePanel />
        <FunnelPanel />
        <PostingsPanel />
        <WeeklyPanel />
        <ActivityPanel />
        <DeskContentPanel />
        <CvsPanel />
        <LettersPanel />
      </div>
    </div>
  );
}
