<script setup lang="ts">
import { computed, ref } from "vue";
import { createError, navigateTo, refreshNuxtData, useFetch, useSeoMeta } from "nuxt/app";
import type { EntryRecord } from "~/data/cv";
import { useDeskRequest } from "~/utils/desk-request";
import { useDragReorder } from "~/utils/drag-reorder";
import { usePageChecks } from "~/utils/desk-page-checks";
import { useUnsavedGuard } from "~/utils/desk-unsaved";

const { section, id } = defineProps<{
  section: EntryRecord["section"];
  id: string;
}>();

const { data: content } = await useFetch("/api/desk/cv-content", { key: "desk-cv-content" });
const { data: variants } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });

const stored = computed(() =>
  content.value?.entries.find((entry) => entry.id === id && entry.section === section),
);

if (!stored.value) {
  throw createError({ statusCode: 404, message: `No ${section} entry "${id}".`, fatal: true });
}

useSeoMeta({
  title: () => `${stored.value?.title ?? id} · CV · Desk`,
  robots: "noindex, nofollow",
});

/** The form's state: tech as one comma-separated line. */
function toForm(entry: EntryRecord) {
  return {
    title: entry.title,
    organization: entry.organization,
    location: entry.location,
    from: entry.from,
    to: entry.to,
    tech: entry.tech.join(", "),
    bullets: entry.bullets.map((bullet) => ({ ...bullet })),
    links: entry.links.map((link) => ({ ...link })),
  };
}

const draft = ref(toForm(stored.value));
const saved = computed(() => (stored.value ? toForm(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
const guard = useUnsavedGuard(() => dirty.value);

/** Names of the variants that print a bullet (or, without one, the entry). */
function usedBy(bulletId?: string): string[] {
  return (variants.value?.variants ?? [])
    .filter((variant) =>
      variant[section].some(
        (pick) => pick.id === id && (!bulletId || pick.bullets.includes(bulletId)),
      ),
    )
    .map((variant) => variant.label);
}

const drag = useDragReorder(
  () => draft.value.bullets.map((bullet) => bullet.id),
  (ids) => {
    draft.value.bullets = ids.flatMap(
      (bulletId) => draft.value.bullets.find((bullet) => bullet.id === bulletId) ?? [],
    );
  },
);

/** A new bullet gets an id that no bullet of this entry has had in the draft. */
function addBullet() {
  const taken = new Set(draft.value.bullets.map((bullet) => bullet.id));
  let number = draft.value.bullets.length + 1;

  while (taken.has(`bullet-${number}`)) {
    number += 1;
  }

  draft.value.bullets.push({ id: `bullet-${number}`, text: "" });
}

function removeBullet(bulletId: string) {
  const users = usedBy(bulletId);

  // oxlint-disable-next-line no-alert -- a desk-only safety net before dropping printed text
  if (users.length > 0 && !confirm(`${users.join(", ")} print this bullet. Remove it anyway?`)) {
    return;
  }

  draft.value.bullets = draft.value.bullets.filter((bullet) => bullet.id !== bulletId);
}

function addLink() {
  draft.value.links.push({ text: "", href: "" });
}

function removeLink(index: number) {
  draft.value.links.splice(index, 1);
}

const request = useDeskRequest();
const pageChecks = usePageChecks();
const url = `/api/desk/cv-entries/${id}`;

async function refreshContent() {
  await refreshNuxtData(["desk-cv-content", "desk-cv-variants"]);
  pageChecks.forget();
}

async function save() {
  const body = { ...draft.value, section, tech: draft.value.tech.split(",") };

  if (await request.run(() => $fetch<unknown>(url, { method: "PUT", body }))) {
    await refreshContent();
    draft.value = structuredClone(saved.value);
  }
}

function discard() {
  draft.value = structuredClone(saved.value);
  request.error.value = "";
}

async function remove() {
  const users = usedBy();
  const note = users.length > 0 ? ` ${users.join(", ")} print it and will drop it.` : "";

  // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
  if (!confirm(`Delete "${saved.value.title}"?${note}`)) {
    return;
  }

  if (await request.run(() => $fetch<unknown>(url, { method: "DELETE" }))) {
    guard.leave();
    await navigateTo(`/desk/cv/${section}`);
    await refreshContent();
  }
}

const actions = [{ label: "Delete", icon: "tabler:trash", run: remove, danger: true }];
</script>

<template>
  <form class="entry" @submit.prevent="save">
    <header class="entry__header">
      <div class="entry__heading">
        <p class="entry__path">
          <NuxtLink to="/desk/cv" class="entry__crumb">~/desk/cv</NuxtLink> /
          <NuxtLink :to="`/desk/cv/${section}`" class="entry__crumb">{{ section }}</NuxtLink> /
          {{ id }}
        </p>
        <h1 class="entry__title">{{ draft.title || id }}</h1>
        <p class="entry__sub">{{ draft.organization }}</p>
      </div>

      <DeskMenu :actions="actions" label="Entry actions" />
    </header>

    <p v-if="request.error.value && !dirty" class="entry__error" role="alert">
      {{ request.error.value }}
    </p>

    <div class="entry__fields">
      <label class="field entry__wide">
        <span class="field__label">title</span>
        <input v-model="draft.title" class="input" required />
      </label>
      <label class="field">
        <span class="field__label">organization</span>
        <input v-model="draft.organization" class="input" required />
      </label>
      <label class="field">
        <span class="field__label">location</span>
        <input v-model="draft.location" class="input" placeholder="Berlin" />
      </label>
      <label class="field">
        <span class="field__label">from</span>
        <input v-model="draft.from" class="input" type="month" required />
      </label>
      <label class="field">
        <span class="field__label">to</span>
        <input v-model="draft.to" class="input" type="month" />
        <span class="field__hint">Empty means ongoing.</span>
      </label>
      <label class="field entry__wide">
        <span class="field__label">tech</span>
        <input v-model="draft.tech" class="input" placeholder="TypeScript, Vue, Nuxt" />
        <span class="field__hint">Comma-separated, in display order.</span>
      </label>
    </div>

    <section class="entry__group" aria-labelledby="bullets-label">
      <h2 id="bullets-label" class="section-label">bullets</h2>

      <ol v-if="draft.bullets.length" class="bullets">
        <li
          v-for="bullet in draft.bullets"
          :key="bullet.id"
          class="bullets__item"
          :class="{ 'bullets__item--dragged': drag.dragged.value === bullet.id }"
          draggable="true"
          @dragstart="drag.start(bullet.id, $event)"
          @dragover.prevent="drag.over(bullet.id)"
          @drop.prevent
          @dragend="drag.end()"
        >
          <button
            type="button"
            class="bullets__handle"
            aria-label="Move bullet: arrow up or down"
            title="Drag, or use the arrow keys"
            @keydown="drag.key(bullet.id, $event)"
          >
            <Icon name="tabler:grip-vertical" size="16" />
          </button>

          <div class="bullets__body">
            <textarea
              v-model="bullet.text"
              class="input bullets__text"
              rows="2"
              required
              :aria-label="`Bullet ${bullet.id}`"
            />
            <span class="bullets__meta">
              {{
                usedBy(bullet.id).length ? `in ${usedBy(bullet.id).join(", ")}` : "in no variant"
              }}
            </span>
          </div>

          <button
            type="button"
            class="icon-button"
            aria-label="Remove bullet"
            title="Remove bullet"
            @click="removeBullet(bullet.id)"
          >
            <Icon name="tabler:trash" size="16" />
          </button>
        </li>
      </ol>

      <button type="button" class="button button--outline entry__add" @click="addBullet">
        <Icon name="tabler:plus" size="16" />
        Add bullet
      </button>
    </section>

    <section class="entry__group" aria-labelledby="links-label">
      <h2 id="links-label" class="section-label">links</h2>

      <ul v-if="draft.links.length" class="links">
        <li v-for="(link, index) in draft.links" :key="index" class="links__item">
          <input
            v-model="link.text"
            class="input"
            placeholder="Text"
            aria-label="Link text"
            required
          />
          <input
            v-model="link.href"
            class="input"
            placeholder="https://… or /file.pdf"
            aria-label="Link address"
            required
          />
          <button
            type="button"
            class="icon-button"
            aria-label="Remove link"
            title="Remove link"
            @click="removeLink(index)"
          >
            <Icon name="tabler:trash" size="16" />
          </button>
        </li>
      </ul>

      <button type="button" class="button button--outline entry__add" @click="addLink">
        <Icon name="tabler:plus" size="16" />
        Add link
      </button>
    </section>

    <DeskSaveBar
      v-if="dirty"
      :busy="request.busy.value"
      :error="request.error.value"
      @discard="discard"
    />
  </form>
</template>

<style scoped>
.entry {
  display: grid;
  align-content: start;
  gap: var(--space-8);
  max-inline-size: 52rem;
  padding: var(--space-10) var(--space-6);
}

@media (min-width: 48rem) {
  .entry {
    padding: var(--space-12) var(--space-12);
  }
}

.entry__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.entry__heading {
  display: grid;
  gap: var(--space-2);
}

.entry__path {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.entry__crumb {
  color: inherit;
}

.entry__crumb:hover {
  color: var(--color-accent);
}

.entry__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.entry__sub {
  color: var(--color-text-soft);
}

.entry__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.entry__fields {
  display: grid;
  gap: var(--space-5);
}

@media (min-width: 40rem) {
  .entry__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .entry__wide {
    grid-column: 1 / -1;
  }
}

.entry__group {
  display: grid;
  gap: var(--space-3);
}

.entry__add {
  justify-self: start;
}

.bullets,
.links {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.bullets__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.bullets__item--dragged {
  border-color: var(--color-accent);
  opacity: 0.6;
}

.bullets__handle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 2.25rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  cursor: grab;
}

.bullets__handle:hover,
.bullets__handle:focus-visible {
  color: var(--color-accent);
}

.bullets__body {
  display: grid;
  flex: 1;
  gap: var(--space-1);
  min-inline-size: 0;
}

.bullets__text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.bullets__meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.links__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) auto;
  align-items: center;
  gap: var(--space-2);
}
</style>
