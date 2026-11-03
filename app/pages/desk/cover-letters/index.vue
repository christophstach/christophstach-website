<script setup lang="ts">
import { COVER_LETTER_LANGUAGES, COVER_LETTER_WORDING } from "~/data/cover-letter-wording";
import { computed, ref, watch } from "vue";
import { navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import { rewordLetter, slugify } from "~/utils/cover-letter";
import type { CoverLetter } from "~/data/cover-letters";
import { formatDay } from "~/utils/format";
import { letterStatus } from "~/utils/cv-layout";
import { useDeskRequest } from "~/utils/desk-request";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Cover letters · Desk",
  robots: "noindex, nofollow",
});

const route = useRoute();
const { data: letters } = await useFetch("/api/desk/cover-letters", {
  key: "desk-cover-letters",
});

// "?new" opens the form, "?new&from=<id>" to duplicate that letter.
const creating = computed(() => route.query.new !== undefined);
const source = computed(() => letters.value?.find((letter) => letter.id === route.query.from));

const form = ref<Pick<CoverLetter, "id" | "company" | "jobTitle" | "language">>({
  id: "",
  company: "",
  jobTitle: "",
  language: "en",
});

watch(
  source,
  (letter) => {
    form.value = {
      id: "",
      company: letter?.company ?? "",
      jobTitle: letter?.jobTitle ?? "",
      language: letter?.language ?? "en",
    };
  },
  { immediate: true },
);

const request = useDeskRequest();

const placeholderId = computed(
  () => slugify(`${form.value.company} ${form.value.jobTitle}`) || "acme-frontend",
);

/** A new letter with the default wording in English, reworded for the form's values. */
function blank(): CoverLetter {
  const { salutation, closing, subject } = COVER_LETTER_WORDING.en;

  return {
    id: "",
    label: "",
    note: "",
    variantId: "",
    company: "",
    recipient: "",
    jobTitle: "",
    jobUrl: "",
    jobDescription: "",
    language: "en",
    letterDate: "",
    subject: subject(""),
    salutation,
    body: "",
    closing,
  };
}

async function create() {
  const id = form.value.id.trim() || slugify(`${form.value.company} ${form.value.jobTitle}`);
  const start = source.value ?? blank();
  const body = {
    ...rewordLetter(start, form.value.language, form.value.jobTitle.trim()),
    label: [form.value.company.trim(), form.value.jobTitle.trim()].filter(Boolean).join(", "),
    company: form.value.company,
    // A duplicate is for another application: only the text carries over.
    recipient: source.value && form.value.company !== source.value.company ? "" : start.recipient,
    jobUrl: "",
    jobDescription: "",
    letterDate: new Date().toISOString().slice(0, 10),
  };

  if (await request.run(() => $fetch(`/api/desk/cover-letters/${id}`, { method: "POST", body }))) {
    await refreshNuxtData("desk-cover-letters");
    await navigateTo(`/desk/cover-letters/${id}`);
  }
}
</script>

<template>
  <div class="desk-page">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path">~/desk/cover-letters</p>
        <h1 class="desk-head__title">Cover letters</h1>
        <p class="desk-head__sub">One for each application. Private, only in the desk.</p>
      </div>

      <NuxtLink v-if="!creating" to="/desk/cover-letters?new" class="button button--primary">
        <Icon name="tabler:plus" size="16" />
        New letter
      </NuxtLink>
    </header>

    <form v-if="creating" class="create" @submit.prevent="create">
      <h2 class="create__title">
        {{ source ? `Duplicate ${source.label}` : "New letter" }}
      </h2>

      <div class="create__fields">
        <label class="field">
          <span class="field__label">company</span>
          <input v-model="form.company" class="input" required placeholder="Acme" />
        </label>

        <label class="field">
          <span class="field__label">job title</span>
          <input v-model="form.jobTitle" class="input" placeholder="Senior Frontend Engineer" />
        </label>

        <label class="field">
          <span class="field__label">language</span>
          <select v-model="form.language" class="input">
            <option v-for="language in COVER_LETTER_LANGUAGES" :key="language" :value="language">
              {{ COVER_LETTER_WORDING[language].name }}
            </option>
          </select>
          <span class="field__hint">Sets the date format and the default wording.</span>
        </label>

        <label class="field">
          <span class="field__label">id</span>
          <input
            v-model="form.id"
            class="input"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            :placeholder="placeholderId"
          />
          <span class="field__hint">The URL slug. Left empty, it is the one shown here.</span>
        </label>
      </div>

      <p v-if="request.error.value" class="create__error" role="alert">
        {{ request.error.value }}
      </p>

      <div class="create__actions">
        <button type="submit" class="button button--primary" :disabled="request.busy.value">
          {{ request.busy.value ? "Creating…" : "Create letter" }}
        </button>
        <NuxtLink to="/desk/cover-letters" class="button button--outline">Cancel</NuxtLink>
      </div>
    </form>

    <ul v-if="letters?.length" class="letters">
      <li v-for="letter in letters" :key="letter.id">
        <NuxtLink :to="`/desk/cover-letters/${letter.id}`" class="letter">
          <span class="letter__label">{{ letter.label }}</span>
          <span v-if="letter.note" class="desk-note">{{ letter.note }}</span>
          <span class="letter__meta">
            <span v-if="letter.letterDate">{{ formatDay(letter.letterDate, "en") }}</span>
            <span>{{ COVER_LETTER_WORDING[letter.language].name }}</span>
            <span :class="`letter__status--${letterStatus(letter.pageFills).tone}`">
              {{ letterStatus(letter.pageFills).text }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <p v-else-if="!creating" class="letters__empty">No cover letters yet.</p>
  </div>
</template>

<style scoped>
.create {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-6);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.create__title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.create__fields {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 48rem) {
  .create__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

.create__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.create__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.letters {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
  border-top: 1px solid var(--color-border);
}

.letter {
  display: grid;
  gap: var(--space-1-5);
  padding: var(--space-4) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.letter:hover {
  background-color: var(--color-hover);
}

.letter__label {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.letter__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.letter__status--warn {
  color: var(--color-signal);
}

.letters__empty {
  color: var(--color-text-muted);
}
</style>
