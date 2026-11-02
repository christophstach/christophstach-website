<script setup lang="ts">
import { computed, watch } from "vue";
import { refreshNuxtData, useFetch } from "nuxt/app";
import { letterWarnings } from "~/utils/cv-layout";

const { id, revision } = defineProps<{
  /** Id of the cover letter to check. */
  id: string;
  /** Bumped after the letter is saved, to check it again. */
  revision: number;
}>();

// Loaded in the browser because printing a PDF means a few seconds of Chrome.
// Typed by hand: matching this URL against every typed route exceeds the type
// checker's stack depth.
const { data, error: fetchError } = useFetch<{ pages: { fill: number }[] }>(
  () => `/api/desk/cover-letters/${id}/pages`,
  {
    query: computed(() => ({ revision })),
    server: false,
    lazy: true,
  },
);

const pages = computed(() => data.value?.pages);

const error = computed(() => {
  if (!fetchError.value) {
    return "";
  }

  const body = fetchError.value.data as { message?: string } | undefined;

  return body?.message ?? fetchError.value.message;
});

const warnings = computed(() =>
  pages.value ? letterWarnings(pages.value.map((page) => page.fill)) : [],
);

// The check is stored with the letter; the list shows it.
watch(pages, async () => {
  await refreshNuxtData("desk-cover-letters");
});
</script>

<template>
  <section class="letter-pages" aria-labelledby="letter-pages-title">
    <h2 id="letter-pages-title" class="letter-pages__title">Pages</h2>

    <p v-if="error" class="letter-pages__note">Couldn't read the PDF. {{ error }}</p>
    <p v-else-if="!pages" class="letter-pages__note">Printing the PDF to measure it…</p>

    <template v-else>
      <DeskPageSheets :pages="pages" />

      <ul v-if="warnings.length" class="letter-pages__warnings" role="status">
        <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
      </ul>
      <p v-else class="letter-pages__note">Fits on one page.</p>
    </template>

    <p class="letter-pages__note">
      <a :href="`/api/desk/cover-letters/${id}/pdf`" class="text-link" target="_blank">
        Open the PDF
      </a>
      (the last saved version).
    </p>
  </section>
</template>

<style scoped>
.letter-pages {
  display: grid;
  gap: var(--space-3);
}

.letter-pages__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.letter-pages__note {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.letter-pages__warnings {
  display: grid;
  gap: var(--space-1-5);
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: var(--text-sm);
  color: var(--color-signal);
}
</style>
