<script setup lang="ts">
import { computed, ref } from "vue";
import { createError, navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import type { CvVariant } from "~/data/cv-variants";
import { useDeskRequest } from "~/utils/desk-request";
import { useUnsavedGuard } from "~/utils/desk-unsaved";
import { variantContent } from "~/utils/desk-variant";

definePageMeta({ layout: "desk" });

const route = useRoute();
const id = String(route.params.variant);

const { data } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });

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
const purpose = computed(() => {
  if (isPrimary.value) {
    return "The CV visitors download.";
  }

  return isWebsite.value ? "Feeds the curriculum page." : "Private, only in the desk.";
});

// The editor works on a copy until it is saved.
const draft = ref<CvVariant>(variantContent(stored.value));
const saved = computed(() => (stored.value ? variantContent(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
// Asks before leaving with unsaved changes.
const guard = useUnsavedGuard(() => dirty.value);

const request = useDeskRequest();
// Bumped after every save, so the PDF check runs again.
const revision = ref(0);

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
  <div class="desk-page editor">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path"><NuxtLink to="/desk/cv">~/desk/cv</NuxtLink> / {{ id }}</p>
        <h1 class="desk-head__title">{{ draft.label || id }}</h1>
        <p class="desk-head__sub editor__role">
          <span v-if="isPrimary" class="role-tag">PDF</span>
          <span v-if="isWebsite" class="role-tag">/curriculum</span>
          <span>{{ purpose }}</span>
        </p>
      </div>

      <DeskMenu :actions="actions" label="Variant actions" />
    </header>

    <p v-if="request.error.value && !dirty" class="desk-error" role="alert">
      {{ request.error.value }}
    </p>

    <form class="editor__body" @submit.prevent="save">
      <DeskVariantPicks v-model="draft" />

      <aside class="editor__rail">
        <DeskCvPdf :variant="id" :primary="isPrimary" :revision="revision" />

        <label class="field">
          <span class="field__label">name in the desk</span>
          <input v-model="draft.label" class="input" required />
        </label>
      </aside>

      <DeskSaveBar
        v-if="dirty"
        :busy="request.busy.value"
        :error="request.error.value"
        @discard="discard"
      />
    </form>
  </div>
</template>

<style scoped>
.editor__role {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.editor__body {
  display: grid;
  gap: var(--space-10);
}

@media (min-width: 72rem) {
  .editor__body {
    grid-template-columns: minmax(0, 1fr) 15rem;
    column-gap: var(--space-12);
    align-items: start;
  }

  .editor__rail {
    position: sticky;
    top: var(--space-6);
  }
}

.editor__rail {
  display: grid;
  align-content: start;
  gap: var(--space-8);
}
</style>
