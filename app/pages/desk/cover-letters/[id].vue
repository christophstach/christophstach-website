<script setup lang="ts">
import {
  COVER_LETTER_LANGUAGES,
  COVER_LETTER_MARGIN_MM,
  COVER_LETTER_WORDING,
} from "~/data/cover-letter-wording";
import type { CoverLetter, CoverLetterLanguage } from "~/data/cover-letters";
import { computed, ref } from "vue";
import { createError, navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import { printedLetter, rewordLetter } from "~/utils/cover-letter";
import { useDeskRequest } from "~/utils/desk-request";
import { useUnsavedGuard } from "~/utils/desk-unsaved";

definePageMeta({ layout: "desk" });

const route = useRoute();
const id = String(route.params.id);

const { data: letters } = await useFetch("/api/desk/cover-letters", {
  key: "desk-cover-letters",
});
const { data: variants } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });
const { data: profile } = await useFetch("/api/desk/profile", { key: "desk-profile" });

const stored = computed(() => letters.value?.find((letter) => letter.id === id));

if (!stored.value) {
  throw createError({ statusCode: 404, message: `No cover letter "${id}".`, fatal: true });
}

useSeoMeta({
  title: () => `${stored.value?.label ?? id} · Cover letters · Desk`,
  robots: "noindex, nofollow",
});

/** The form's state: the letter without its page check. */
function toForm(letter: CoverLetter): CoverLetter {
  return {
    id: letter.id,
    label: letter.label,
    note: letter.note,
    variantId: letter.variantId,
    company: letter.company,
    recipient: letter.recipient,
    jobTitle: letter.jobTitle,
    jobUrl: letter.jobUrl,
    jobDescription: letter.jobDescription,
    language: letter.language,
    letterDate: letter.letterDate,
    subject: letter.subject,
    salutation: letter.salutation,
    body: letter.body,
    closing: letter.closing,
  };
}

// The editor works on a copy until it is saved.
const draft = ref(toForm(stored.value));
const saved = computed(() => (stored.value ? toForm(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
// Asks before leaving with unsaved changes.
const guard = useUnsavedGuard(() => dirty.value);

const linkedVariant = computed(() =>
  variants.value?.variants.find((variant) => variant.id === draft.value.variantId),
);

// The sheet in the rail shows the draft, before it is saved.
const preview = computed(() =>
  profile.value ? printedLetter(draft.value, profile.value, linkedVariant.value?.role) : undefined,
);

function changeLanguage(language: CoverLetterLanguage) {
  draft.value = rewordLetter(draft.value, language, draft.value.jobTitle);
}

function changeJobTitle(jobTitle: string) {
  draft.value = rewordLetter(draft.value, draft.value.language, jobTitle);
}

const request = useDeskRequest();
// Bumped after every save, so the PDF check runs again.
const revision = ref(0);
// Writes are typed <unknown>: matching these URLs against every typed route
// exceeds the type checker's stack depth.
const url = `/api/desk/cover-letters/${id}`;

async function save() {
  if (await request.run(() => $fetch(url, { method: "PUT", body: draft.value }))) {
    await refreshNuxtData("desk-cover-letters");
    draft.value = toForm(saved.value);
    revision.value += 1;
  }
}

function discard() {
  draft.value = toForm(saved.value);
  request.error.value = "";
}

async function remove() {
  // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
  if (!confirm(`Delete the cover letter "${saved.value.label}"?`)) {
    return;
  }

  if (await request.run(() => $fetch(url, { method: "DELETE" }))) {
    guard.leave();
    await navigateTo("/desk/cover-letters");
    await refreshNuxtData("desk-cover-letters");
  }
}

const actions = [
  {
    label: "Duplicate",
    icon: "tabler:copy",
    run: () => navigateTo(`/desk/cover-letters?new&from=${id}`),
  },
  { label: "Delete", icon: "tabler:trash", run: remove, danger: true },
];
</script>

<template>
  <div class="desk-page editor">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path">
          <NuxtLink to="/desk/cover-letters">~/desk/cover-letters</NuxtLink> / {{ id }}
        </p>
        <h1 class="desk-head__title">{{ draft.label || id }}</h1>
        <p class="desk-head__sub">Private, only in the desk.</p>
      </div>

      <DeskMenu :actions="actions" label="Letter actions" />
    </header>

    <p v-if="request.error.value && !dirty" class="desk-error" role="alert">
      {{ request.error.value }}
    </p>

    <form class="editor__body" @submit.prevent="save">
      <div class="panels">
        <DeskFormSection title="in the desk" description="Only you see these, never the letter.">
          <label class="field">
            <span class="field__label">name</span>
            <input v-model="draft.label" class="input" required />
          </label>
          <label class="field">
            <span class="field__label">cv variant</span>
            <select v-model="draft.variantId" class="input">
              <option value="">None</option>
              <option
                v-for="variant in variants?.variants ?? []"
                :key="variant.id"
                :value="variant.id"
              >
                {{ variant.label }}
              </option>
            </select>
            <span class="field__hint">
              The CV you send with it; its role prints under your name.
              <a
                v-if="linkedVariant"
                :href="`/api/desk/cv/${linkedVariant.id}`"
                class="text-link"
                target="_blank"
              >
                Open the CV
              </a>
            </span>
          </label>
          <label class="field field--wide">
            <span class="field__label">note</span>
            <textarea
              v-model="draft.note"
              class="input"
              rows="2"
              placeholder="Where you applied, who you spoke to."
            />
          </label>
        </DeskFormSection>

        <DeskFormSection title="job" description="Only the company prints.">
          <label class="field">
            <span class="field__label">company</span>
            <input v-model="draft.company" class="input" required />
          </label>
          <label class="field">
            <span class="field__label">job title</span>
            <input
              :value="draft.jobTitle"
              class="input"
              @input="changeJobTitle(($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field field--wide">
            <span class="field__label">url</span>
            <input v-model="draft.jobUrl" class="input" type="url" placeholder="https://…" />
          </label>
          <label class="field field--wide">
            <span class="field__label">description</span>
            <textarea
              v-model="draft.jobDescription"
              class="input"
              rows="4"
              placeholder="The ad, kept here to write against, also after it goes offline."
            />
          </label>
        </DeskFormSection>

        <DeskFormSection title="letter" description="A blank line starts a new paragraph.">
          <label class="field">
            <span class="field__label">language</span>
            <select
              :value="draft.language"
              class="input"
              @change="
                changeLanguage(($event.target as HTMLSelectElement).value as CoverLetterLanguage)
              "
            >
              <option v-for="language in COVER_LETTER_LANGUAGES" :key="language" :value="language">
                {{ COVER_LETTER_WORDING[language].name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">date</span>
            <input v-model="draft.letterDate" class="input" type="date" />
          </label>
          <label class="field field--wide">
            <span class="field__label">recipient</span>
            <textarea
              v-model="draft.recipient"
              class="input"
              rows="2"
              placeholder="A person or an address, under the company."
            />
          </label>
          <label class="field field--wide">
            <span class="field__label">subject</span>
            <input v-model="draft.subject" class="input" />
          </label>
          <label class="field field--wide">
            <span class="field__label">salutation</span>
            <input v-model="draft.salutation" class="input" />
          </label>
          <label class="field field--wide">
            <span class="field__label">text</span>
            <textarea v-model="draft.body" class="input" rows="14" />
          </label>
          <label class="field field--wide">
            <span class="field__label">closing</span>
            <input v-model="draft.closing" class="input" />
          </label>
        </DeskFormSection>
      </div>

      <aside class="editor__rail">
        <DeskCoverLetterPages :id="id" :revision="revision" />

        <section class="preview" aria-labelledby="letter-preview-title">
          <h2 id="letter-preview-title" class="preview__title">Preview</h2>
          <div class="preview__frame">
            <div class="preview__sheet" :style="{ padding: `${COVER_LETTER_MARGIN_MM}mm` }">
              <CoverLetterDocument v-if="preview" :letter="preview" />
            </div>
          </div>
        </section>
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
.editor__body {
  display: grid;
  gap: var(--space-10);
}

@media (min-width: 84rem) {
  .editor__body {
    grid-template-columns: minmax(0, 1fr) 26rem;
    column-gap: var(--space-6);
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
  gap: var(--space-6);
  min-inline-size: 0;
  padding: var(--space-5);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.preview {
  display: grid;
  gap: var(--space-3);
  min-inline-size: 0;
}

.preview__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.preview__frame {
  overflow-x: auto;
}

/* An A4 sheet at the rail's width: 23.5rem of the sheet's 210mm. */
.preview__sheet {
  box-sizing: border-box;
  inline-size: 210mm;
  min-block-size: 297mm;
  background-color: var(--color-paper);
  box-shadow: var(--color-paper-shadow);
  zoom: 0.47;
}
</style>
