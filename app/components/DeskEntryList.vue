<script setup lang="ts">
import { computed, ref } from "vue";
import { navigateTo, refreshNuxtData, useFetch, useRoute } from "nuxt/app";
import type { EntryRecord } from "~/data/cv";
import { formatMonth } from "~/utils/format";
import { useDeskRequest } from "~/utils/desk-request";
import { usePageChecks } from "~/utils/desk-page-checks";

const { section } = defineProps<{
  section: EntryRecord["section"];
}>();

const route = useRoute();
const { data: content } = await useFetch("/api/desk/cv-content", { key: "desk-cv-content" });
const { data: variants } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });

const entries = computed(() =>
  (content.value?.entries ?? []).filter((entry) => entry.section === section),
);

const heading = section === "experience" ? "Experience" : "Education";

function period(entry: EntryRecord): string {
  return `${formatMonth(entry.from)} – ${entry.to ? formatMonth(entry.to) : "now"}`;
}

/** How many variants pick this entry. */
function usedBy(id: string): number {
  return (variants.value?.variants ?? []).filter((variant) =>
    variant[section].some((pick) => pick.id === id),
  ).length;
}

// "?new" opens the form.
const creating = computed(() => route.query.new !== undefined);
const form = ref({ id: "", name: "", title: "", organization: "", from: "" });
const request = useDeskRequest();
const pageChecks = usePageChecks();

async function create() {
  const id = form.value.id.trim();
  const body = {
    ...form.value,
    section,
    note: "",
    location: "",
    to: "",
    tech: [],
    bullets: [],
    links: [],
  };

  if (
    await request.run(() => $fetch<unknown>(`/api/desk/cv-entries/${id}`, { method: "POST", body }))
  ) {
    await refreshNuxtData(["desk-cv-content", "desk-cv-variants"]);
    pageChecks.forget();
    form.value = { id: "", name: "", title: "", organization: "", from: "" };
    await navigateTo(`/desk/cv/${section}/${id}`);
  }
}
</script>

<template>
  <div class="overview">
    <header class="overview__header">
      <div class="overview__heading">
        <p class="overview__path">
          <NuxtLink to="/desk/cv" class="overview__crumb">~/desk/cv</NuxtLink> / {{ section }}
        </p>
        <h1 class="overview__title">{{ heading }}</h1>
        <p class="overview__intro">
          The entries and bullets variants pick from. A change here reaches every variant that uses
          it.
        </p>
      </div>

      <NuxtLink v-if="!creating" :to="`/desk/cv/${section}?new`" class="button button--primary">
        <Icon name="tabler:plus" size="16" />
        New entry
      </NuxtLink>
    </header>

    <form v-if="creating" class="create" @submit.prevent="create">
      <h2 class="create__title">New entry</h2>

      <div class="create__fields">
        <label class="field">
          <span class="field__label">id</span>
          <input
            v-model="form.id"
            class="input"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="acme"
          />
          <span class="field__hint"
            >Lowercase letters, digits and hyphens. Can't change later.</span
          >
        </label>
        <label class="field">
          <span class="field__label">name</span>
          <input v-model="form.name" class="input" required placeholder="Acme, platform team" />
          <span class="field__hint">Only the desk shows it.</span>
        </label>
        <label class="field">
          <span class="field__label">title</span>
          <input v-model="form.title" class="input" required />
        </label>
        <label class="field">
          <span class="field__label">organization</span>
          <input v-model="form.organization" class="input" required />
        </label>
        <label class="field">
          <span class="field__label">from</span>
          <input v-model="form.from" class="input" type="month" required />
        </label>
      </div>

      <p v-if="request.error.value" class="create__error" role="alert">
        {{ request.error.value }}
      </p>

      <div class="create__actions">
        <button type="submit" class="button button--primary" :disabled="request.busy.value">
          {{ request.busy.value ? "Creating…" : "Create entry" }}
        </button>
        <NuxtLink :to="`/desk/cv/${section}`" class="button button--outline">Cancel</NuxtLink>
      </div>
    </form>

    <ul v-if="entries.length" class="cards">
      <li v-for="entry in entries" :key="entry.id">
        <NuxtLink :to="`/desk/cv/${section}/${entry.id}`" class="card">
          <span class="card__top">
            <span class="card__label">{{ entry.name || entry.title }}</span>
            <span class="card__period">{{ period(entry) }}</span>
          </span>
          <span class="card__org">
            {{ entry.title }} at {{ entry.organization
            }}<template v-if="entry.location">, {{ entry.location }}</template>
          </span>
          <span v-if="entry.note" class="desk-note">{{ entry.note }}</span>
          <span class="card__meta">
            <span>{{ entry.bullets.length }} bullets</span>
            <span>{{
              usedBy(entry.id) ? `in ${usedBy(entry.id)} variants` : "in no variant"
            }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <p v-else class="overview__empty">No entries yet.</p>
  </div>
</template>

<style scoped>
.overview {
  display: grid;
  gap: var(--space-10);
  max-width: 64rem;
  padding: var(--space-10) var(--space-6);
}

@media (min-width: 48rem) {
  .overview {
    padding: var(--space-12) var(--space-12);
  }
}

.overview__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
}

.overview__heading {
  display: grid;
  gap: var(--space-2);
}

.overview__path,
.overview__empty {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.overview__crumb {
  color: inherit;
}

.overview__crumb:hover {
  color: var(--color-accent);
}

.overview__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.overview__intro {
  color: var(--color-text-soft);
}

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

.cards {
  display: grid;
  gap: var(--space-3);
  padding: 0;
  margin: 0;
  list-style: none;
}

.card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
}

.card__top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1) var(--space-4);
}

.card__label {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.card__period,
.card__meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.card__org {
  color: var(--color-text-soft);
}

.card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-5);
}
</style>
