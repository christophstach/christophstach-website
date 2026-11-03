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
  title: () => `${stored.value?.name || stored.value?.title || id} · CV · Desk`,
  robots: "noindex, nofollow",
});

/** The form's state: tech as one comma-separated line. */
function toForm(entry: EntryRecord) {
  return {
    name: entry.name,
    note: entry.note,
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

  if (await request.run(() => $fetch(url, { method: "PUT", body }))) {
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
  if (!confirm(`Delete "${saved.value.name || saved.value.title}"?${note}`)) {
    return;
  }

  if (await request.run(() => $fetch(url, { method: "DELETE" }))) {
    guard.leave();
    await navigateTo(`/desk/cv/${section}`);
    await refreshContent();
  }
}

const actions = [{ label: "Delete", icon: "tabler:trash", run: remove, danger: true }];
</script>

<template>
  <form class="desk-page" @submit.prevent="save">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path">
          <NuxtLink to="/desk/cv">~/desk/cv</NuxtLink> /
          <NuxtLink :to="`/desk/cv/${section}`">{{ section }}</NuxtLink> / {{ id }}
        </p>
        <h1 class="desk-head__title">{{ draft.name || draft.title || id }}</h1>
        <p class="desk-head__sub">
          {{ draft.title }} at {{ draft.organization }}
          <span class="entry__used">
            {{ usedBy().length ? `in ${usedBy().join(", ")}` : "in no variant" }}
          </span>
        </p>
      </div>

      <DeskMenu :actions="actions" label="Entry actions" />
    </header>

    <p v-if="request.error.value && !dirty" class="desk-error" role="alert">
      {{ request.error.value }}
    </p>

    <div class="panels">
      <DeskFormSection
        title="in the desk"
        description="Only you see these, never the CV or the site."
      >
        <label class="field">
          <span class="field__label">name</span>
          <input v-model="draft.name" class="input" required />
        </label>
        <label class="field field--wide">
          <span class="field__label">note</span>
          <textarea
            v-model="draft.note"
            class="input"
            rows="2"
            placeholder="What this entry is for, e.g. which jobs it fits."
          />
        </label>
      </DeskFormSection>

      <DeskFormSection title="basics" description="What you did, and where.">
        <label class="field field--wide">
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
      </DeskFormSection>

      <DeskFormSection title="period" description="An empty end means it is ongoing.">
        <label class="field">
          <span class="field__label">from</span>
          <input v-model="draft.from" class="input" type="month" required />
        </label>
        <label class="field">
          <span class="field__label">to</span>
          <input v-model="draft.to" class="input" type="month" />
        </label>
      </DeskFormSection>

      <DeskFormSection title="tech" description="Shown as chips under the entry." single>
        <label class="field">
          <span class="field__label">technologies</span>
          <textarea
            v-model="draft.tech"
            class="input"
            rows="1"
            placeholder="TypeScript, Vue, Nuxt"
          />
          <span class="field__hint">Comma-separated, in display order.</span>
        </label>
      </DeskFormSection>

      <DeskFormSection
        title="bullets"
        description="Variants pick bullets one by one. Drag to set the order new picks start with."
        single
      >
        <ol v-if="draft.bullets.length" class="form-rows">
          <li
            v-for="bullet in draft.bullets"
            :key="bullet.id"
            class="bullet"
            :class="{ 'bullet--dragged': drag.dragged.value === bullet.id }"
            draggable="true"
            @dragstart="drag.start(bullet.id, $event)"
            @dragover.prevent="drag.over(bullet.id)"
            @drop.prevent
            @dragend="drag.end()"
          >
            <button
              type="button"
              class="bullet__handle"
              aria-label="Move bullet: arrow up or down"
              title="Drag, or use the arrow keys"
              @keydown="drag.key(bullet.id, $event)"
            >
              <Icon name="tabler:grip-vertical" size="16" />
            </button>

            <div class="bullet__body">
              <textarea
                v-model="bullet.text"
                class="input bullet__text"
                rows="2"
                required
                :aria-label="`Bullet ${bullet.id}`"
              />
              <span class="bullet__meta">
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

        <button type="button" class="button button--outline add-button" @click="addBullet">
          <Icon name="tabler:plus" size="16" />
          Add bullet
        </button>
      </DeskFormSection>

      <DeskFormSection title="links" description="Shown under the entry, e.g. a thesis." single>
        <ul v-if="draft.links.length" class="form-rows">
          <li v-for="(link, index) in draft.links" :key="index" class="link-row">
            <input
              v-model="link.text"
              class="input"
              placeholder="Text"
              aria-label="Link text"
              required
            />
            <input
              v-model="link.href"
              class="input link-row__href"
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

        <button type="button" class="button button--outline add-button" @click="addLink">
          <Icon name="tabler:plus" size="16" />
          Add link
        </button>
      </DeskFormSection>
    </div>

    <DeskSaveBar
      v-if="dirty"
      :busy="request.busy.value"
      :error="request.error.value"
      @discard="discard"
    />
  </form>
</template>

<style scoped>
.entry__used {
  margin-left: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.add-button {
  justify-self: start;
}

.bullet {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.bullet--dragged {
  opacity: 0.5;
}

.bullet__handle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 2.5rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  cursor: grab;
}

.bullet__handle:hover,
.bullet__handle:focus-visible {
  color: var(--color-accent);
}

.bullet__body {
  display: grid;
  flex: 1;
  gap: var(--space-1);
  min-inline-size: 0;
}

.bullet__text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.bullet__meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
