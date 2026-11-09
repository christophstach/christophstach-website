import { For, Show, createMemo } from "solid-js";
import {
  getDeskContent,
  getDeskCoverLetters,
  getDeskProjects,
  getDeskVariants,
} from "../../../lib/desk/queries";
import { letterStatus, pageStatus } from "../../../lib/cv-layout";
import { DeskMeta } from "../../../components/desk/DeskMeta";
import type { RouteDefinition } from "@solidjs/router";
import { formatRelative } from "../../../lib/format";
import { paths } from "../../../router";
import { running } from "../../../lib/desk/page-checks";
import styles from "../../../components/desk/page-index.module.css";

const LATEST_LETTERS = 5;

function variantStatus(variant: { id: string; pageFills: number[] }) {
  return running().includes(variant.id)
    ? { tone: "none" as const, text: "checking pages…" }
    : pageStatus(variant.pageFills);
}

function ContentPanel() {
  const content = createMemo(() => getDeskContent());
  const projects = createMemo(() => getDeskProjects());

  const stats = () => {
    const { entries, skills } = content();
    const inSection = (section: string) => entries.filter((entry) => entry.section === section);

    return [
      {
        to: paths.desk.cv.experience(),
        label: "experience",
        count: inSection("experience").length,
      },
      { to: paths.desk.cv.education(), label: "education", count: inSection("education").length },
      {
        to: paths.desk.cv.experience(),
        label: "bullets",
        count: entries.reduce((sum, entry) => sum + entry.bullets.length, 0),
      },
      { to: paths.desk.cv.skills(), label: "skill groups", count: skills.length },
      { to: paths.desk.cv.projects(), label: "projects", count: projects().length },
    ];
  };

  return (
    <section class="panel" aria-labelledby="panel-content">
      <header class="panel__head">
        <h2 id="panel-content" class="panel__title">
          cv content
        </h2>
      </header>

      <ul class={styles.stats}>
        <For each={stats()}>
          {(stat) => (
            <li>
              <a href={stat.to} class={styles.stat}>
                <span class={styles.stat__count}>{stat.count}</span>
                <span class={styles.stat__label}>{stat.label}</span>
              </a>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}

function VariantsPanel() {
  const data = createMemo(() => getDeskVariants());
  const isPublic = (id: string) => id === data().primaryId || id === data().websiteId;

  // The public variants first, then the most recently edited.
  const variants = () =>
    data().variants.toSorted(
      (first, second) =>
        Number(isPublic(second.id)) - Number(isPublic(first.id)) ||
        second.updatedAt.localeCompare(first.updatedAt),
    );

  return (
    <section class="panel" aria-labelledby="panel-variants">
      <header class="panel__head">
        <h2 id="panel-variants" class="panel__title">
          cv variants
        </h2>
        <a href={paths.desk.cv({ new: "" })} class={["text-link panel__end", styles["add-link"]]}>
          New variant
        </a>
      </header>

      <Show when={variants().length > 0} fallback={<p class="panel__empty">No CV variants yet.</p>}>
        <ul class="panel__rows">
          <For each={variants()}>
            {(variant) => (
              <li>
                <a href={paths.desk.cv(variant.id)} class={["panel-row", styles.row]}>
                  <span class={styles.row__main}>
                    <span class="panel-row__label">{variant.label}</span>
                    <Show when={variant.id === data().primaryId}>
                      <span class={"role-tag"}>PDF</span>
                    </Show>
                    <Show when={variant.id === data().websiteId}>
                      <span class={"role-tag"}>/curriculum</span>
                    </Show>
                  </span>
                  <span class="panel-row__meta">
                    <span class={`desk-status desk-status--${variantStatus(variant).tone}`}>
                      {variantStatus(variant).text}
                    </span>
                  </span>
                  <span class="panel-row__meta">{formatRelative(variant.updatedAt)}</span>
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
          <a href="/desk/cover-letters" class={["text-link panel__end", styles["add-link"]]}>
            All {letters().length} letters
          </a>
        </Show>
        <a
          href="/desk/cover-letters?new"
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
                <a href={`/desk/cover-letters/${letter.id}`} class={["panel-row", styles.row]}>
                  <span class={styles.row__main}>
                    <span class="panel-row__label">{letter.label}</span>
                  </span>
                  <span class="panel-row__meta">
                    <span class={`desk-status desk-status--${letterStatus(letter.pageFills).tone}`}>
                      {letterStatus(letter.pageFills).text}
                    </span>
                  </span>
                  <span class="panel-row__meta">
                    {letter.jobTitle === "" ? letter.company : letter.jobTitle}
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
    void getDeskVariants();
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
          <p class="desk-head__sub">What the CVs are built from, and how they print.</p>
        </div>
      </header>

      <div class="panels">
        <ContentPanel />
        <VariantsPanel />
        <LettersPanel />
      </div>
    </div>
  );
}
