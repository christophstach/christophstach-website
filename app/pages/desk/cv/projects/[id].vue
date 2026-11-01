<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { createError, navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";
import { useDeskRequest } from "~/utils/desk-request";

definePageMeta({ layout: "desk" });

const route = useRoute();
const id = String(route.params.id);

const { data: projects } = await useFetch("/api/desk/projects", { key: "desk-projects" });
const { data: variants } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });

const stored = computed(() => projects.value?.find((project) => project.id === id));

if (!stored.value) {
  throw createError({ statusCode: 404, message: `No project "${id}".`, fatal: true });
}

useSeoMeta({
  title: () => `${stored.value?.title ?? id} · Projects · Desk`,
  robots: "noindex, nofollow",
});

/** The form's state: tech as one comma-separated line. */
function toForm(project: NonNullable<typeof stored.value>) {
  return {
    title: project.title,
    description: project.description,
    tech: project.tech.join(", "),
    url: project.url,
  };
}

const draft = ref(toForm(stored.value));
const saved = computed(() => (stored.value ? toForm(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));

const usedBy = computed(() =>
  (variants.value?.variants ?? []).filter((variant) => variant.projects.includes(id)),
);

const request = useDeskRequest();
const url = `/api/desk/projects/${id}`;

async function save() {
  const body = { ...draft.value, tech: draft.value.tech.split(",") };

  if (await request.run(() => $fetch<unknown>(url, { method: "PUT", body }))) {
    await refreshNuxtData("desk-projects");
    draft.value = { ...saved.value };
  }
}

function discard() {
  draft.value = { ...saved.value };
  request.error.value = "";
}

// Set when the editor leaves on purpose, after deleting the project.
let leaving = false;

async function remove() {
  // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
  if (!confirm(`Delete the project "${saved.value.title}"? Variants that show it drop it.`)) {
    return;
  }

  if (await request.run(() => $fetch<unknown>(url, { method: "DELETE" }))) {
    leaving = true;
    await navigateTo("/desk/cv/projects");
    await refreshNuxtData(["desk-projects", "desk-cv-variants"]);
  }
}

const actions = [{ label: "Delete", icon: "tabler:trash", run: remove, danger: true }];

function confirmLeave() {
  // oxlint-disable-next-line no-alert -- a desk-only safety net for unsaved work
  if (dirty.value && !leaving && !confirm("Leave without saving your changes?")) {
    return false;
  }

  return true;
}

// Update covers going to another one: the same route with a new id.
onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate(confirmLeave);

function warnOnUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault();
  }
}

onMounted(() => window.addEventListener("beforeunload", warnOnUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", warnOnUnload));
</script>

<template>
  <form class="project" @submit.prevent="save">
    <header class="project__header">
      <div class="project__heading">
        <p class="project__path">
          <NuxtLink to="/desk/cv" class="project__crumb">~/desk/cv</NuxtLink> /
          <NuxtLink to="/desk/cv/projects" class="project__crumb">projects</NuxtLink> /
          {{ id }}
        </p>
        <h1 class="project__title">{{ draft.title || id }}</h1>
      </div>

      <DeskMenu :actions="actions" label="Project actions" />
    </header>

    <p v-if="request.error.value && !dirty" class="project__error" role="alert">
      {{ request.error.value }}
    </p>

    <div class="project__fields">
      <label class="field">
        <span class="field__label">title</span>
        <input v-model="draft.title" class="input" required />
      </label>
      <label class="field">
        <span class="field__label">description</span>
        <textarea v-model="draft.description" class="input" rows="4" />
      </label>
      <label class="field">
        <span class="field__label">tech</span>
        <input v-model="draft.tech" class="input" placeholder="Vue, Nuxt, TypeScript" />
        <span class="field__hint">Comma-separated, in display order.</span>
      </label>
      <label class="field">
        <span class="field__label">url</span>
        <input v-model="draft.url" class="input" type="url" placeholder="https://…" />
        <span class="field__hint">Optional: the title links here.</span>
      </label>
    </div>

    <section class="project__used" aria-labelledby="used-by">
      <h2 id="used-by" class="section-label">shown by</h2>
      <p v-if="!usedBy.length" class="project__none">
        No variant shows this project. Pick it in a variant's projects tab.
      </p>
      <ul v-else class="project__variants">
        <li v-for="variant in usedBy" :key="variant.id">
          <NuxtLink :to="`/desk/cv/${variant.id}`" class="text-link">{{ variant.label }}</NuxtLink>
          <span v-if="variant.id === variants?.websiteId" class="role-tag">/curriculum</span>
        </li>
      </ul>
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
.project {
  display: grid;
  align-content: start;
  gap: var(--space-8);
  max-inline-size: 48rem;
  padding: var(--space-10) var(--space-6);
}

@media (min-width: 48rem) {
  .project {
    padding: var(--space-12) var(--space-12);
  }
}

.project__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.project__heading {
  display: grid;
  gap: var(--space-2);
}

.project__path {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.project__crumb {
  color: inherit;
}

.project__crumb:hover {
  color: var(--color-accent);
}

.project__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.project__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.project__fields {
  display: grid;
  gap: var(--space-5);
}

.project__used {
  display: grid;
  gap: var(--space-3);
}

.project__none {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.project__variants {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  padding: 0;
  margin: 0;
  list-style: none;
}

.project__variants li {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
