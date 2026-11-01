<script setup lang="ts">
import { computed, watch } from "vue";
import { layoutWarnings, percent } from "~/utils/cv-layout";
import { refreshNuxtData, useFetch } from "nuxt/app";

const { variant, primary, revision } = defineProps<{
  /** Id of the CV variant to check. */
  variant: string;
  /** Whether it is the public variant, the PDF that visitors download. */
  primary: boolean;
  /** Bumped after the variant is saved, to check it again. */
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
  <section class="cv-pdf" aria-labelledby="cv-pdf-title">
    <header class="cv-pdf__head">
      <h2 id="cv-pdf-title" class="cv-pdf__title">pdf pages</h2>
      <span v-if="error" class="cv-pdf__status cv-pdf__status--warn">error</span>
      <span v-else-if="!pages" class="cv-pdf__status">rendering…</span>
      <span v-else-if="warnings.length" class="cv-pdf__status cv-pdf__status--warn">
        {{ warnings.length }} {{ warnings.length === 1 ? "warning" : "warnings" }}
      </span>
      <span v-else class="cv-pdf__status cv-pdf__status--ok">{{ pages.length }} pages · ok</span>
    </header>

    <div class="cv-pdf__body">
      <p v-if="error" class="cv-pdf__note">Couldn't read the PDF. {{ error }}</p>
      <p v-else-if="!pages" class="cv-pdf__note">Rendering the PDF to measure each page…</p>

      <template v-else>
        <ol class="cv-pdf__pages">
          <li v-for="(page, index) in pages" :key="index" class="cv-pdf__page">
            <span class="cv-pdf__label">page {{ index + 1 }}</span>
            <span class="cv-pdf__value">{{ percent(page.fill) }}</span>
            <span class="cv-pdf__bar" aria-hidden="true">
              <span class="cv-pdf__fill" :style="{ inlineSize: `${page.fill * 100}%` }" />
            </span>
          </li>
        </ol>

        <ul v-if="warnings.length" class="cv-pdf__warnings" role="status">
          <li v-for="warning in warnings" :key="warning">
            <Icon name="tabler:alert-triangle" size="16" />
            <span>{{ warning }}</span>
          </li>
        </ul>
      </template>
    </div>

    <footer class="cv-pdf__foot">
      <a :href="src" class="button button--outline" target="_blank">
        <Icon name="tabler:external-link" size="16" />
        Open PDF
      </a>
      <span class="cv-pdf__note">
        {{ isPrimary ? "Public: the download on the site." : "Private: only from the desk." }}
      </span>
    </footer>
  </section>
</template>

<style scoped>
.cv-pdf {
  display: grid;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.cv-pdf__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2-5) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.cv-pdf__title {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.cv-pdf__status {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.cv-pdf__status--ok {
  color: var(--color-accent);
}

.cv-pdf__status--warn {
  color: var(--color-signal);
}

.cv-pdf__body {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
}

.cv-pdf__note {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.cv-pdf__pages {
  display: grid;
  gap: var(--space-4);
  padding: 0;
  margin: 0;
  list-style: none;
}

.cv-pdf__page {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-1-5);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

.cv-pdf__bar {
  grid-column: 1 / -1;
  block-size: 0.375rem;
  border-radius: var(--radius-full);
  background-color: var(--color-hover);
  overflow: hidden;
}

.cv-pdf__fill {
  display: block;
  block-size: 100%;
  border-radius: inherit;
  background: var(--color-accent);
}

.cv-pdf__warnings {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.cv-pdf__warnings li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.cv-pdf__warnings :deep(svg) {
  flex: none;
  margin-top: 0.15em;
}

.cv-pdf__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}
</style>
