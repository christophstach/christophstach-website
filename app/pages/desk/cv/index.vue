<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import { variantContent, variantCounts } from "~/utils/desk-variant";
import { formatRelative } from "~/utils/format";
import { pageStatus } from "~/utils/cv-layout";
import { useDeskRequest } from "~/utils/desk-request";
import { usePageChecks } from "~/utils/desk-page-checks";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "CV variants · Desk",
  robots: "noindex, nofollow",
});

const route = useRoute();
const { running } = usePageChecks();

/** The card's page status: running checks first, then the stored result. */
function status(variant: { id: string; pageFills: number[] }) {
  return running.value.includes(variant.id)
    ? { tone: "none" as const, text: "checking pages…" }
    : pageStatus(variant.pageFills);
}
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

  const body = { ...variantContent(base), label: form.value.label.trim(), note: "" };
  const created = await request.run(() =>
    $fetch(`/api/desk/cv-variants/${id}`, { method: "POST", body }),
  );

  if (created) {
    await refreshNuxtData("desk-cv-variants");
    form.value = { id: "", label: "", from: primaryId.value };
    await navigateTo(`/desk/cv/${id}`);
  }
}
</script>

<template>
  <div class="desk-page">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path">~/desk/cv</p>
        <h1 class="desk-head__title">CV variants</h1>
        <p class="desk-head__sub">
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
          <span class="field__label">name</span>
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

    <div class="panels">
      <section
        v-for="group in groups"
        v-show="group.variants.length"
        :key="group.id"
        class="panel"
        :aria-labelledby="`group-${group.id}`"
      >
        <header class="panel__head">
          <h2 :id="`group-${group.id}`" class="panel__title">{{ group.heading }}</h2>
        </header>

        <ul class="panel__rows">
          <li v-for="variant in group.variants" :key="variant.id">
            <NuxtLink :to="`/desk/cv/${variant.id}`" class="panel-row">
              <span class="row__top">
                <span class="panel-row__label">{{ variant.label }}</span>
                <span v-if="variant.id === primaryId" class="role-tag">PDF</span>
                <span v-if="variant.id === websiteId" class="role-tag">/curriculum</span>
              </span>

              <span class="row__role">{{ variant.role }}</span>
              <span v-if="variant.note" class="desk-note">{{ variant.note }}</span>

              <span class="panel-row__meta">
                <span class="desk-status" :class="`desk-status--${status(variant).tone}`">
                  {{ status(variant).text }}
                </span>
                <span>{{ variantCounts(variant) }}</span>
                <span>{{ formatRelative(variant.updatedAt) }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <p v-if="!variants.length" class="panel panel__empty">No CV variants in the database.</p>
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

.row__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.row__role {
  color: var(--color-text-soft);
  font-size: var(--text-sm);
}
</style>
