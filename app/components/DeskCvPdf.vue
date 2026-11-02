<script setup lang="ts">
import { computed, watch } from "vue";
import { layoutWarnings, percent } from "~/utils/cv-layout";
import { refreshNuxtData, useFetch } from "nuxt/app";
import type { CvVariant } from "~/data/cv-variants";
import { layoutQuery } from "~/data/cv-print-layout";

const { variant, primary, revision, trial } = defineProps<{
  /** Id of the CV variant to check. */
  variant: string;
  /** Whether it is the public variant, the PDF that visitors download. */
  primary: boolean;
  /** Bumped after the variant is saved, to check it again. */
  revision: number;
  /** Unsaved layout steps to print instead of the stored ones, or undefined. */
  trial: CvVariant["layout"] | undefined;
}>();

const isPrimary = computed(() => primary);

// The primary variant is the public PDF; the others are private desk routes.
const src = computed(() =>
  isPrimary.value ? "/christoph-stach-cv.pdf" : `/api/desk/cv/${variant}`,
);

// Loaded in the browser because rendering a PDF means a few seconds of Chrome.
const { data, error: fetchError } = useFetch("/api/desk/cv-pdf", {
  query: computed(() => ({ variant, revision, ...(trial ? layoutQuery(trial) : {}) })),
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

// The check of the stored steps is stored with the variant; the overview and
// sidebar show it. A trial isn't stored.
watch(pages, async () => {
  if (!data.value?.trial) {
    await refreshNuxtData("desk-cv-variants");
  }
});
</script>

<template>
  <section class="cv-pdf" aria-labelledby="cv-pdf-title">
    <div class="cv-pdf__head">
      <h2 id="cv-pdf-title" class="cv-pdf__title">Pages</h2>
      <span v-if="data?.trial" class="cv-pdf__trial">unsaved layout</span>
    </div>

    <p v-if="error" class="cv-pdf__note">Couldn't read the PDF. {{ error }}</p>
    <p v-else-if="!pages" class="cv-pdf__note">Printing the PDF to measure each page…</p>

    <template v-else>
      <!-- Each page as a small A4 sheet, filled as far down as its text runs. -->
      <ol class="cv-pdf__pages">
        <li
          v-for="(page, index) in pages"
          :key="index"
          class="cv-pdf__page"
          :aria-label="`Page ${index + 1}: ${percent(page.fill)} full`"
        >
          <span class="cv-pdf__sheet" aria-hidden="true">
            <span class="cv-pdf__fill" :style="{ blockSize: `${page.fill * 100}%` }" />
          </span>
          <span class="cv-pdf__value" aria-hidden="true">{{ percent(page.fill) }}</span>
        </li>
      </ol>

      <ul v-if="warnings.length" class="cv-pdf__warnings" role="status">
        <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
      </ul>
      <p v-else class="cv-pdf__note">
        Fits on {{ pages.length }} {{ pages.length === 1 ? "page" : "pages" }}.
      </p>
    </template>

    <p class="cv-pdf__note">
      <a :href="src" class="text-link" target="_blank">Open the PDF</a>
      {{ isPrimary ? " (the public download)." : " (private, desk only)." }}
    </p>
  </section>
</template>

<style scoped>
.cv-pdf {
  display: grid;
  gap: var(--space-3);
}

.cv-pdf__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.cv-pdf__trial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-signal);
}

.cv-pdf__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.cv-pdf__note {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.cv-pdf__pages {
  display: flex;
  gap: var(--space-3);
  padding: 0;
  margin: 0;
  list-style: none;
}

.cv-pdf__page {
  display: grid;
  justify-items: center;
  gap: var(--space-1-5);
}

.cv-pdf__sheet {
  display: block;
  inline-size: 4.25rem;
  aspect-ratio: 210 / 297;
  padding: 0.4rem;
  border-radius: 2px;
  background-color: var(--color-paper);
  box-shadow: var(--color-paper-shadow);
}

/* Text lines drawn as stripes, down to where the page's text ends. */
.cv-pdf__fill {
  display: block;
  inline-size: 100%;
  background: repeating-linear-gradient(
    to bottom,
    var(--color-paper-rule) 0 2px,
    transparent 2px 5px
  );
}

.cv-pdf__value {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.cv-pdf__warnings {
  display: grid;
  gap: var(--space-1-5);
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: var(--text-sm);
  color: var(--color-signal);
}
</style>
