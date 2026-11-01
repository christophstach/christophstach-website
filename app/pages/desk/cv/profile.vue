<script setup lang="ts">
import { computed, ref } from "vue";
import { createError, refreshNuxtData, useFetch, useSeoMeta } from "nuxt/app";
import type { Profile } from "~/data/cv";
import { useDeskRequest } from "~/utils/desk-request";
import { usePageChecks } from "~/utils/desk-page-checks";
import { useUnsavedGuard } from "~/utils/desk-unsaved";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Profile · CV · Desk",
  robots: "noindex, nofollow",
});

const { data: stored } = await useFetch("/api/desk/profile", { key: "desk-profile" });

if (!stored.value) {
  throw createError({ statusCode: 500, message: "No CV profile.", fatal: true });
}

/** The form's state: core technologies as one comma-separated line. */
function toForm(profile: Profile) {
  return {
    name: profile.name,
    role: profile.role,
    location: profile.location,
    email: profile.email,
    phone: profile.phone,
    coreTechnologies: profile.coreTechnologies.join(", "),
    links: profile.links.map((link) => ({ ...link })),
  };
}

const draft = ref(toForm(stored.value));
const saved = computed(() => (stored.value ? toForm(stored.value) : draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));

useUnsavedGuard(() => dirty.value);

function addLink() {
  draft.value.links.push({ label: "", href: "" });
}

function removeLink(index: number) {
  draft.value.links.splice(index, 1);
}

const request = useDeskRequest();
const pageChecks = usePageChecks();

async function save() {
  const body = { ...draft.value, coreTechnologies: draft.value.coreTechnologies.split(",") };

  if (await request.run(() => $fetch<unknown>("/api/desk/profile", { method: "PUT", body }))) {
    await refreshNuxtData(["desk-profile", "desk-cv-variants"]);
    pageChecks.forget();
    draft.value = structuredClone(saved.value);
  }
}

function discard() {
  draft.value = structuredClone(saved.value);
  request.error.value = "";
}
</script>

<template>
  <form class="profile" @submit.prevent="save">
    <header class="profile__heading">
      <p class="profile__path">
        <NuxtLink to="/desk/cv" class="profile__crumb">~/desk/cv</NuxtLink> / profile
      </p>
      <h1 class="profile__title">Profile</h1>
      <p class="profile__intro">The header every variant's PDF prints.</p>
    </header>

    <p v-if="request.error.value && !dirty" class="profile__error" role="alert">
      {{ request.error.value }}
    </p>

    <div class="profile__fields">
      <label class="field">
        <span class="field__label">name</span>
        <input v-model="draft.name" class="input" required />
      </label>
      <label class="field">
        <span class="field__label">role</span>
        <input v-model="draft.role" class="input" />
        <span class="field__hint">Not printed: each variant has its own role line.</span>
      </label>
      <label class="field">
        <span class="field__label">location</span>
        <input v-model="draft.location" class="input" />
      </label>
      <label class="field">
        <span class="field__label">email</span>
        <input v-model="draft.email" class="input" type="email" />
      </label>
      <label class="field">
        <span class="field__label">phone</span>
        <input v-model="draft.phone" class="input" type="tel" />
      </label>
      <label class="field profile__wide">
        <span class="field__label">core technologies</span>
        <textarea v-model="draft.coreTechnologies" class="input" rows="2" />
        <span class="field__hint">Comma-separated, in display order. Not printed yet.</span>
      </label>
    </div>

    <section class="profile__group" aria-labelledby="links-label">
      <h2 id="links-label" class="section-label">links</h2>

      <ul v-if="draft.links.length" class="links">
        <li v-for="(link, index) in draft.links" :key="index" class="links__item">
          <input
            v-model="link.label"
            class="input"
            placeholder="GitHub"
            aria-label="Link label"
            required
          />
          <input
            v-model="link.href"
            class="input"
            type="url"
            placeholder="https://…"
            aria-label="Link address"
            required
          />
          <button
            type="button"
            class="icon-button"
            aria-label="Remove link"
            title="Remove link"
            @click="removeLink(index)"
          >
            <Icon name="tabler:trash" size="16" />
          </button>
        </li>
      </ul>

      <button type="button" class="button button--outline profile__add" @click="addLink">
        <Icon name="tabler:plus" size="16" />
        Add link
      </button>
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
.profile {
  display: grid;
  align-content: start;
  gap: var(--space-8);
  max-inline-size: 52rem;
  padding: var(--space-10) var(--space-6);
}

@media (min-width: 48rem) {
  .profile {
    padding: var(--space-12) var(--space-12);
  }
}

.profile__heading {
  display: grid;
  gap: var(--space-2);
}

.profile__path {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.profile__crumb {
  color: inherit;
}

.profile__crumb:hover {
  color: var(--color-accent);
}

.profile__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.profile__intro {
  color: var(--color-text-soft);
}

.profile__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.profile__fields {
  display: grid;
  gap: var(--space-5);
}

@media (min-width: 40rem) {
  .profile__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .profile__wide {
    grid-column: 1 / -1;
  }
}

.profile__group {
  display: grid;
  gap: var(--space-3);
}

.profile__add {
  justify-self: start;
}

.links {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.links__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) auto;
  align-items: center;
  gap: var(--space-2);
}
</style>
