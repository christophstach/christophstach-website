<script setup lang="ts">
import { computed, watch } from "vue";
import { layoutWarnings, percent } from "~/utils/cv-layout";
import { refreshNuxtData, useFetch } from "nuxt/app";

const { variant, primary, revision } = defineProps<{
  /** Id of the CV variant to check and preview. */
  variant: string;
  /** Whether it is the public variant, the PDF that visitors download. */
  primary: boolean;
  /** Bumped after the variant is saved, to check and preview it again. */
  revision: number;
}>();

const isPrimary = computed(() => primary);

// The primary variant is the public PDF; the others are private desk routes.
const src = computed(() =>
  isPrimary.value ? "/christoph-stach-cv.pdf" : `/api/desk/cv/${variant}`,
);

// Loaded in the browser because rendering a PDF means a few seconds of Chrome.
const { data, error: fetchError } = useFetch("/api/desk/cv-pdf", {
  query: computed(() => ({ variant, revision })),
  server: false,
  lazy: true,
});

const pages = computed(() => data.value?.pages);

// The desk API puts the cause in its error body; show that over the generic
// "[GET] … 502" message of the fetch error.
const error = computed(() => {
  if (!fetchError.value) {
    return "";
  }

  const body = fetchError.value.data as { message?: string } | undefined;

  return body?.message ?? fetchError.value.message;
});

const warnings = computed(() =>
  pages.value ? layoutWarnings(pages.value.map((page) => page.fill)) : [],
);

// The check is stored with the variant; the overview and sidebar show it.
watch(pages, async () => {
  await refreshNuxtData("desk-cv-variants");
});
</script>

<template>
  <div class="cv-pdf">
    <p v-if="error" class="cv-pdf__note">Couldn't read the PDF. {{ error }}</p>
    <p v-else-if="!pages" class="cv-pdf__note">Rendering the PDF…</p>

    <template v-else>
      <ol class="cv-pdf__pages">
        <li v-for="(page, index) in pages" :key="index" class="cv-pdf__page">
          <span class="cv-pdf__label">page {{ index + 1 }}</span>
          <span class="cv-pdf__bar" aria-hidden="true">
            <span class="cv-pdf__fill" :style="{ inlineSize: `${page.fill * 100}%` }" />
          </span>
          <span class="cv-pdf__value">{{ percent(page.fill) }}</span>
        </li>
      </ol>

      <ul v-if="warnings.length" class="cv-pdf__warnings" role="status">
        <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
      </ul>
      <p v-else class="cv-pdf__note">Layout looks fine.</p>
    </template>

    <p class="cv-pdf__actions">
      <a :href="src" class="text-link" target="_blank">Open PDF</a>
      <span v-if="isPrimary" class="cv-pdf__note">Public: the download on the site.</span>
      <span v-else class="cv-pdf__note">Private: only reachable from the desk.</span>
    </p>

    <iframe
      :key="`${src}-${revision}`"
      :src="`${src}#view=FitH`"
      title="CV PDF preview"
      class="cv-pdf__preview"
    />
  </div>
</template>

<style scoped>
.cv-pdf__note {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.cv-pdf__pages {
  display: grid;
  gap: var(--space-2);
  max-width: 28rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.cv-pdf__page {
  display: grid;
  grid-template-columns: 4.5rem 1fr 3.5rem;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.cv-pdf__bar {
  block-size: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.cv-pdf__fill {
  display: block;
  block-size: 100%;
  background: var(--color-accent);
}

.cv-pdf__value {
  text-align: end;
}

.cv-pdf__warnings {
  display: grid;
  gap: var(--space-1);
  padding: 0;
  margin: var(--space-4) 0 0;
  list-style: none;
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.cv-pdf__pages + .cv-pdf__note {
  margin-top: var(--space-4);
}

.cv-pdf__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.cv-pdf__preview {
  display: block;
  inline-size: 100%;
  block-size: 80vh;
  margin-top: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
</style>
