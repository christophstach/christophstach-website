<script setup lang="ts">
import { computed, ref } from "vue";
import { createError, navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import type { CvVariant } from "~/data/cv-variants";
import DeskCvPdf from "~/components/DeskCvPdf.vue";
import { useDeskRequest } from "~/utils/desk-request";
import { useUnsavedGuard } from "~/utils/desk-unsaved";
import { variantContent } from "~/utils/desk-variant";

definePageMeta({ layout: "desk" });

type Section = "experience" | "education";
type Tab = "basics" | Section | "projects" | "skills";

const route = useRoute();
const id = String(route.params.variant);

const { data } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });
const { data: projects } = await useFetch("/api/desk/projects", { key: "desk-projects" });
const { data: content } = await useFetch("/api/desk/cv-content", { key: "desk-cv-content" });

const stored = computed(() => data.value?.variants.find((variant) => variant.id === id));

if (!stored.value) {
  throw createError({ statusCode: 404, message: `No CV variant "${id}".`, fatal: true });
}

useSeoMeta({
  title: () => `${stored.value?.label ?? id} · CV · Desk`,
  robots: "noindex, nofollow",
});

const isPrimary = computed(() => data.value?.primaryId === id);
const isWebsite = computed(() => data.value?.websiteId === id);

// The editor works on a copy until it is saved.
const draft = ref<CvVariant>(variantContent(stored.value));
const saved = computed(() => (stored.value ? variantContent(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
// Asks before leaving with unsaved changes.
const guard = useUnsavedGuard(() => dirty.value);

const request = useDeskRequest();
// Bumped after every save, so the PDF check runs again.
const revision = ref(0);

// Entries of a section, newest first, from the database.
function entriesOf(section: Section) {
  return (content.value?.entries ?? []).filter((entry) => entry.section === section);
}

function findEntry(section: Section, entryId: string) {
  return entriesOf(section).find((entry) => entry.id === entryId);
}

const tab = ref<Tab>("basics");
const tabs = computed(() => [
  { id: "basics" as const, count: undefined },
  { id: "experience" as const, count: draft.value.experience.length },
  { id: "education" as const, count: draft.value.education.length },
  { id: "projects" as const, count: draft.value.projects.length },
  { id: "skills" as const, count: draft.value.skills.length },
]);

function pickOf(section: Section, entryId: string) {
  return draft.value[section].find((pick) => pick.id === entryId);
}

function bulletIds(section: Section, entryId: string): string[] {
  return (findEntry(section, entryId)?.bullets ?? []).map((bullet) => bullet.id);
}

function entryItems(section: Section) {
  return entriesOf(section).map((entry) => {
    const pick = pickOf(section, entry.id);
    const total = bulletIds(section, entry.id).length;

    return {
      id: entry.id,
      title: entry.title,
      sub: entry.organization,
      meta: pick && total ? `${pick.bullets.length}/${total} bullets` : undefined,
    };
  });
}

function bulletItems(section: Section, entryId: string) {
  return (findEntry(section, entryId)?.bullets ?? []).map((bullet) => ({
    id: bullet.id,
    title: bullet.text,
  }));
}

/** Picked entry ids; a newly picked entry starts with all its bullets. */
function pickedEntries(section: Section) {
  return computed({
    get: () => draft.value[section].map((pick) => pick.id),
    set: (ids: string[]) => {
      draft.value[section] = ids.map(
        (entryId) =>
          pickOf(section, entryId) ?? { id: entryId, bullets: bulletIds(section, entryId) },
      );
    },
  });
}

const picked = { experience: pickedEntries("experience"), education: pickedEntries("education") };

function setBullets(section: Section, entryId: string, bullets: string[]) {
  const pick = pickOf(section, entryId);

  if (pick) {
    pick.bullets = bullets;
  }
}

const projectItems = computed(() =>
  (projects.value ?? []).map((project) => ({
    id: project.id,
    title: project.title,
    sub: project.tech.slice(0, 4).join(", "),
  })),
);

const skillItems = computed(() =>
  (content.value?.skills ?? []).map((group) => ({
    id: group.label,
    title: group.title,
    sub: group.items.slice(0, 4).join(", "),
  })),
);

// Writes are typed <unknown>: matching these URLs against every typed route
// exceeds the type checker's stack depth.
const url = `/api/desk/cv-variants/${id}`;

async function refreshVariants() {
  await refreshNuxtData("desk-cv-variants");
}

async function save() {
  const done = await request.run(() => $fetch<unknown>(url, { method: "PUT", body: draft.value }));

  if (done) {
    await refreshVariants();
    draft.value = variantContent(saved.value);
    revision.value += 1;
  }
}

function discard() {
  draft.value = variantContent(saved.value);
  request.error.value = "";
}

async function mark(role: "primary" | "website") {
  if (await request.run(() => $fetch<unknown>(`${url}/${role}`, { method: "POST" }))) {
    await refreshVariants();
  }
}

async function remove() {
  // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
  if (!confirm(`Delete the variant "${saved.value.label}"?`)) {
    return;
  }

  if (await request.run(() => $fetch<unknown>(url, { method: "DELETE" }))) {
    guard.leave();
    await navigateTo("/desk/cv");
    await refreshVariants();
  }
}

const actions = computed(() => [
  ...(isPrimary.value
    ? []
    : [{ label: "Make primary (PDF)", icon: "tabler:file-download", run: () => mark("primary") }]),
  ...(isWebsite.value
    ? []
    : [{ label: "Use on website", icon: "tabler:world", run: () => mark("website") }]),
  {
    label: "Duplicate",
    icon: "tabler:copy",
    run: () => navigateTo(`/desk/cv?new&from=${id}`),
  },
  ...(isPrimary.value || isWebsite.value
    ? []
    : [{ label: "Delete", icon: "tabler:trash", run: remove, danger: true }]),
]);
</script>

<template>
  <div class="editor">
    <form class="editor__main" @submit.prevent="save">
      <header class="editor__header">
        <div class="editor__heading">
          <p class="editor__path">
            <NuxtLink to="/desk/cv" class="editor__crumb">~/desk/cv</NuxtLink> / {{ id }}
          </p>
          <h1 class="editor__title">{{ draft.label || id }}</h1>
          <p class="editor__role">
            {{ draft.role }}
            <span v-if="isPrimary" class="role-tag">PDF</span>
            <span v-if="isWebsite" class="role-tag">/curriculum</span>
            <span v-if="!isPrimary && !isWebsite" class="editor__private">private</span>
          </p>
        </div>

        <DeskMenu :actions="actions" label="Variant actions" />
      </header>

      <p v-if="request.error.value && !dirty" class="editor__error" role="alert">
        {{ request.error.value }}
      </p>

      <div class="tabs" role="tablist" aria-label="Variant sections">
        <button
          v-for="item in tabs"
          :id="`tab-${item.id}`"
          :key="item.id"
          type="button"
          role="tab"
          class="tabs__tab"
          :aria-selected="tab === item.id"
          aria-controls="tab-panel"
          @click="tab = item.id"
        >
          {{ item.id }}
          <span v-if="item.count !== undefined" class="tabs__count">{{ item.count }}</span>
        </button>
      </div>

      <div id="tab-panel" role="tabpanel" :aria-labelledby="`tab-${tab}`" class="editor__panel">
        <div v-if="tab === 'basics'" class="basics">
          <label class="field">
            <span class="field__label">label</span>
            <input v-model="draft.label" class="input" required />
            <span class="field__hint">The name in the desk.</span>
          </label>
          <label class="field">
            <span class="field__label">role</span>
            <input v-model="draft.role" class="input" required />
            <span class="field__hint">The role line under the name.</span>
          </label>
          <label class="field field--wide">
            <span class="field__label">summary</span>
            <textarea v-model="draft.summary" class="input" rows="4" />
            <span class="field__hint">One line under the role. Empty prints none.</span>
          </label>
        </div>

        <template v-for="section in ['experience', 'education'] as const" :key="section">
          <p v-if="tab === section" class="editor__note">
            Pick entries and bullets; the text is shared by all variants.
            <NuxtLink :to="`/desk/cv/${section}`" class="text-link">Edit {{ section }}</NuxtLink>
          </p>
          <DeskPickList
            v-if="tab === section"
            v-model="picked[section].value"
            :items="entryItems(section)"
            :label="section"
            expandable
          >
            <template #detail="{ item }">
              <DeskPickList
                :model-value="pickOf(section, item.id)?.bullets ?? []"
                :items="bulletItems(section, item.id)"
                :label="`Bullets of ${item.title}`"
                dense
                @update:model-value="setBullets(section, item.id, $event)"
              />
            </template>
          </DeskPickList>
        </template>

        <template v-if="tab === 'projects'">
          <p class="editor__note">
            Only /curriculum shows projects, the PDF doesn't.
            <NuxtLink to="/desk/cv/projects" class="text-link">Edit projects</NuxtLink>
          </p>
          <DeskPickList v-model="draft.projects" :items="projectItems" label="Projects" />
        </template>

        <template v-if="tab === 'skills'">
          <p class="editor__note">
            Picked groups print as the PDF's skills section.
            <NuxtLink to="/desk/cv/skills" class="text-link">Edit skills</NuxtLink>
          </p>
          <DeskPickList v-model="draft.skills" :items="skillItems" label="Skill groups" />
        </template>
      </div>

      <DeskSaveBar
        v-if="dirty"
        :busy="request.busy.value"
        :error="request.error.value"
        @discard="discard"
      />
    </form>

    <aside class="editor__preview" aria-label="PDF pages">
      <p class="section-label">pages</p>
      <DeskCvPdf :variant="id" :primary="isPrimary" :revision="revision" />
    </aside>
  </div>
</template>

<style scoped>
.editor {
  display: grid;
  gap: var(--space-10);
  padding: var(--space-10) var(--space-6);
}

@media (min-width: 48rem) {
  .editor {
    padding: var(--space-12) var(--space-10);
  }
}

@media (min-width: 80rem) {
  .editor {
    grid-template-columns: minmax(0, 1fr) minmax(22rem, 28rem);
    align-items: start;
  }

  .editor__preview {
    position: sticky;
    top: var(--space-6);
    max-block-size: calc(100dvh - var(--space-12));
    overflow-y: auto;
  }
}

.editor__main {
  display: grid;
  align-content: start;
  gap: var(--space-6);
  max-inline-size: 52rem;
}

.editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.editor__heading {
  display: grid;
  gap: var(--space-2);
}

.editor__path {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.editor__crumb {
  color: inherit;
}

.editor__crumb:hover {
  color: var(--color-accent);
}

.editor__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.editor__role {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-soft);
}

.editor__private {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.editor__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.editor__note {
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.tabs {
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  /* The rule as a shadow: a border plus tabs pulled over it with a negative
     margin would overflow vertically and show a scrollbar. */
  box-shadow: inset 0 -1px 0 var(--color-rule);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

.tabs__tab:hover {
  color: var(--color-heading);
}

.tabs__tab[aria-selected="true"] {
  border-bottom-color: var(--color-accent);
  color: var(--color-heading);
}

.tabs__count {
  padding: 0 var(--space-1-5);
  border-radius: var(--radius-full);
  background-color: var(--color-hover);
  font-size: var(--text-xs);
}

.basics {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

@media (min-width: 40rem) {
  .basics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
</style>
