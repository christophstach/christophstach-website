<script setup lang="ts">
import { computed, ref } from "vue";
import { createError, navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import { useDeskRequest } from "~/utils/desk-request";
import { useUnsavedGuard } from "~/utils/desk-unsaved";

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
  title: () => `${stored.value?.name || stored.value?.title || id} · Projects · Desk`,
  robots: "noindex, nofollow",
});

/** The form's state: tech as one comma-separated line. */
function toForm(project: NonNullable<typeof stored.value>) {
  return {
    name: project.name,
    note: project.note,
    title: project.title,
    description: project.description,
    tech: project.tech.join(", "),
    url: project.url,
  };
}

const draft = ref(toForm(stored.value));
const saved = computed(() => (stored.value ? toForm(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
// Asks before leaving with unsaved changes.
const guard = useUnsavedGuard(() => dirty.value);

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

async function remove() {
  // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
  if (
    !confirm(
      `Delete the project "${saved.value.name || saved.value.title}"? Variants that show it drop it.`,
    )
  ) {
    return;
  }

  if (await request.run(() => $fetch<unknown>(url, { method: "DELETE" }))) {
    guard.leave();
    await navigateTo("/desk/cv/projects");
    await refreshNuxtData(["desk-projects", "desk-cv-variants"]);
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
          <NuxtLink to="/desk/cv/projects">projects</NuxtLink> / {{ id }}
        </p>
        <h1 class="desk-head__title">{{ draft.name || draft.title || id }}</h1>
        <p class="desk-head__sub">Only /curriculum shows projects, never the PDF.</p>
      </div>

      <DeskMenu :actions="actions" label="Project actions" />
    </header>

    <p v-if="request.error.value && !dirty" class="desk-error" role="alert">
      {{ request.error.value }}
    </p>

    <div class="panels">
      <DeskFormSection title="in the desk" description="Only you see these, never the site.">
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
            placeholder="What this project is for, e.g. which jobs it fits."
          />
        </label>
      </DeskFormSection>

      <DeskFormSection title="basics" description="The title links to the url when there is one.">
        <label class="field">
          <span class="field__label">title</span>
          <input v-model="draft.title" class="input" required />
        </label>
        <label class="field">
          <span class="field__label">url</span>
          <input v-model="draft.url" class="input" type="url" placeholder="https://…" />
          <span class="field__hint">Optional.</span>
        </label>
      </DeskFormSection>

      <DeskFormSection title="description" description="A few sentences on what it is." single>
        <label class="field">
          <span class="field__label">text</span>
          <textarea v-model="draft.description" class="input" rows="5" />
        </label>
      </DeskFormSection>

      <DeskFormSection title="tech" description="Shown as chips under the project." single>
        <label class="field">
          <span class="field__label">technologies</span>
          <input v-model="draft.tech" class="input" placeholder="Vue, Nuxt, TypeScript" />
          <span class="field__hint">Comma-separated, in display order.</span>
        </label>
      </DeskFormSection>

      <DeskFormSection
        title="shown by"
        description="Pick projects in a variant's projects tab."
        single
      >
        <p v-if="!usedBy.length" class="project__none">No variant shows this project.</p>
        <ul v-else class="form-rows">
          <li v-for="variant in usedBy" :key="variant.id" class="project__variant">
            <NuxtLink :to="`/desk/cv/${variant.id}`" class="text-link">{{
              variant.label
            }}</NuxtLink>
            <span v-if="variant.id === variants?.websiteId" class="role-tag">/curriculum</span>
          </li>
        </ul>
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
.project__none {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.project__variant {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
