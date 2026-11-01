<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import { variantContent, variantCounts } from "~/utils/desk-variant";
import { formatRelative } from "~/utils/format";
import { pageStatus } from "~/utils/cv-layout";
import { useDeskRequest } from "~/utils/desk-request";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "CV variants · Desk",
  robots: "noindex, nofollow",
});

const route = useRoute();
const { data } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });

const variants = computed(() => data.value?.variants ?? []);
const primaryId = computed(() => data.value?.primaryId ?? "");
const websiteId = computed(() => data.value?.websiteId ?? "");

type Listed = (typeof variants.value)[number];

const isPublic = (variant: Listed) =>
  variant.id === primaryId.value || variant.id === websiteId.value;

const groups = computed(() => [
  {
    id: "public",
    heading: "public",
    variants: variants.value.filter((variant) => isPublic(variant)),
  },
  {
    id: "private",
    heading: "for applications",
    variants: variants.value.filter((variant) => !isPublic(variant)),
  },
]);

// "?new" opens the form; "?new&from=<id>" starts from that variant.
const creating = computed(() => route.query.new !== undefined);
const form = ref({ id: "", label: "", from: "" });
const request = useDeskRequest();

watch(
  () => route.query,
  () => {
    form.value.from = String(route.query.from ?? primaryId.value);
  },
  { immediate: true },
);

async function create() {
  const base = variants.value.find((variant) => variant.id === form.value.from);
  const id = form.value.id.trim();

  if (!base) {
    return;
  }

  const body = { ...variantContent(base), label: form.value.label.trim() };
  const created = await request.run(() =>
    $fetch<unknown>(`/api/desk/cv-variants/${id}`, { method: "POST", body }),
  );

  if (created) {
    await refreshNuxtData("desk-cv-variants");
    form.value = { id: "", label: "", from: primaryId.value };
    await navigateTo(`/desk/cv/${id}`);
  }
}
</script>

<template>
  <div class="overview">
    <header class="overview__header">
      <div class="overview__heading">
        <p class="overview__path">~/desk/cv</p>
        <h1 class="overview__title">CV variants</h1>
        <p class="overview__intro">
          Each variant picks entries and bullets from the CV. One is the PDF, one the website.
        </p>
      </div>

      <NuxtLink v-if="!creating" to="/desk/cv?new" class="button button--primary">
        <Icon name="tabler:plus" size="16" />
        New variant
      </NuxtLink>
    </header>

    <form v-if="creating" class="create" @submit.prevent="create">
      <h2 class="create__title">New variant</h2>

      <div class="create__fields">
        <label class="field">
          <span class="field__label">id</span>
          <input
            v-model="form.id"
            class="input"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="backend"
          />
          <span class="field__hint">The URL slug: lowercase letters, digits and hyphens.</span>
        </label>

        <label class="field">
          <span class="field__label">label</span>
          <input v-model="form.label" class="input" required placeholder="Backend" />
        </label>

        <label class="field">
          <span class="field__label">based on</span>
          <select v-model="form.from" class="input">
            <option v-for="variant in variants" :key="variant.id" :value="variant.id">
              {{ variant.label }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="request.error.value" class="create__error" role="alert">
        {{ request.error.value }}
      </p>

      <div class="create__actions">
        <button type="submit" class="button button--primary" :disabled="request.busy.value">
          {{ request.busy.value ? "Creating…" : "Create variant" }}
        </button>
        <NuxtLink to="/desk/cv" class="button button--outline">Cancel</NuxtLink>
      </div>
    </form>

    <section
      v-for="group in groups"
      v-show="group.variants.length"
      :key="group.id"
      class="group"
      :aria-labelledby="`group-${group.id}`"
    >
      <h2 :id="`group-${group.id}`" class="section-label">{{ group.heading }}</h2>

      <ul class="cards">
        <li v-for="variant in group.variants" :key="variant.id">
          <NuxtLink :to="`/desk/cv/${variant.id}`" class="card">
            <span class="card__top">
              <span class="card__label">{{ variant.label }}</span>
              <span class="card__tags">
                <span v-if="variant.id === primaryId" class="role-tag">PDF</span>
                <span v-if="variant.id === websiteId" class="role-tag">/curriculum</span>
                <span v-if="!isPublic(variant)" class="card__private">private</span>
              </span>
            </span>

            <span class="card__role">{{ variant.role }}</span>

            <span class="card__meta">
              <span
                class="card__status"
                :class="`card__status--${pageStatus(variant.pageFills).tone}`"
              >
                <span class="card__dot" aria-hidden="true" />
                {{ pageStatus(variant.pageFills).text }}
              </span>
              <span>{{ variantCounts(variant) }}</span>
              <span>{{ formatRelative(variant.updatedAt) }}</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <p v-if="!variants.length" class="overview__empty">No CV variants in the database.</p>
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

.overview__path {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.overview__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.overview__intro {
  color: var(--color-text-soft);
}

.overview__empty {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

.group {
  display: grid;
  gap: var(--space-4);
}

.cards {
  display: grid;
  gap: var(--space-4);
  padding: 0;
  margin: 0;
  list-style: none;
}

@media (min-width: 64rem) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  block-size: 100%;
  padding: var(--space-5) var(--space-6);
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
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.card__label {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.card__tags {
  display: flex;
  gap: var(--space-1-5);
}

.card__private {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.card__role {
  color: var(--color-text-soft);
}

.card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.card__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
}

.card__dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: var(--radius-full);
  background-color: var(--color-border-strong);
}

.card__status--ok .card__dot {
  background-color: var(--color-accent);
}

.card__status--warn {
  color: var(--color-signal);
}

.card__status--warn .card__dot {
  background-color: var(--color-signal);
}
</style>
