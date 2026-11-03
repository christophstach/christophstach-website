<script setup lang="ts">
import { letterStatus, pageStatus } from "~/utils/cv-layout";
import { useFetch, useSeoMeta } from "nuxt/app";
import { computed } from "vue";
import { formatRelative } from "~/utils/format";
import { usePageChecks } from "~/utils/desk-page-checks";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Desk",
  robots: "noindex, nofollow",
});

const LATEST_LETTERS = 5;

const { running } = usePageChecks();

const { data: variantData } = await useFetch("/api/desk/cv-variants", {
  key: "desk-cv-variants",
});
const { data: letterData } = await useFetch("/api/desk/cover-letters", {
  key: "desk-cover-letters",
});
const { data: content } = await useFetch("/api/desk/cv-content", { key: "desk-cv-content" });
const { data: projectData } = await useFetch("/api/desk/projects", { key: "desk-projects" });

const primaryId = computed(() => variantData.value?.primaryId ?? "");
const websiteId = computed(() => variantData.value?.websiteId ?? "");

const isPublic = (id: string) => id === primaryId.value || id === websiteId.value;

// The public variants first, then the most recently edited.
const variants = computed(() =>
  (variantData.value?.variants ?? []).toSorted(
    (first, second) =>
      Number(isPublic(second.id)) - Number(isPublic(first.id)) ||
      second.updatedAt.localeCompare(first.updatedAt),
  ),
);

const letters = computed(() => letterData.value ?? []);
const latestLetters = computed(() => letters.value.slice(0, LATEST_LETTERS));

const stats = computed(() => {
  const entries = content.value?.entries ?? [];
  const inSection = (section: string) => entries.filter((entry) => entry.section === section);

  return [
    { to: "/desk/cv/experience", label: "experience", count: inSection("experience").length },
    { to: "/desk/cv/education", label: "education", count: inSection("education").length },
    {
      to: "/desk/cv/experience",
      label: "bullets",
      count: entries.reduce((sum, entry) => sum + entry.bullets.length, 0),
    },
    { to: "/desk/cv/skills", label: "skill groups", count: content.value?.skills.length ?? 0 },
    { to: "/desk/cv/projects", label: "projects", count: projectData.value?.length ?? 0 },
  ];
});

function variantStatus(variant: { id: string; pageFills: number[] }) {
  return running.value.includes(variant.id)
    ? { tone: "none" as const, text: "checking pages…" }
    : pageStatus(variant.pageFills);
}
</script>

<template>
  <div class="overview">
    <header class="overview__heading">
      <p class="overview__path">~/desk</p>
      <h1 class="overview__title">Overview</h1>
    </header>

    <section class="group" aria-labelledby="group-content">
      <h2 id="group-content" class="section-label">cv content</h2>

      <ul class="stats">
        <li v-for="stat in stats" :key="stat.label">
          <NuxtLink :to="stat.to" class="stat">
            <span class="stat__count">{{ stat.count }}</span>
            <span class="stat__label">{{ stat.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section class="group" aria-labelledby="group-variants">
      <div class="group__head">
        <h2 id="group-variants" class="section-label">cv variants</h2>
        <NuxtLink to="/desk/cv?new" class="text-link group__action">New variant</NuxtLink>
      </div>

      <ul v-if="variants.length" class="rows">
        <li v-for="variant in variants" :key="variant.id">
          <NuxtLink :to="`/desk/cv/${variant.id}`" class="row">
            <span class="row__main">
              <span class="row__label">{{ variant.label }}</span>
              <span v-if="variant.id === primaryId" class="role-tag">PDF</span>
              <span v-if="variant.id === websiteId" class="role-tag">/curriculum</span>
            </span>
            <span class="row__status" :class="`row__status--${variantStatus(variant).tone}`">
              <span class="row__dot" aria-hidden="true" />
              {{ variantStatus(variant).text }}
            </span>
            <span class="row__meta">{{ formatRelative(variant.updatedAt) }}</span>
          </NuxtLink>
        </li>
      </ul>

      <p v-else class="group__empty">No CV variants yet.</p>
    </section>

    <section class="group" aria-labelledby="group-letters">
      <div class="group__head">
        <h2 id="group-letters" class="section-label">cover letters</h2>
        <NuxtLink to="/desk/cover-letters?new" class="text-link group__action">New letter</NuxtLink>
      </div>

      <ul v-if="letters.length" class="rows">
        <li v-for="letter in latestLetters" :key="letter.id">
          <NuxtLink :to="`/desk/cover-letters/${letter.id}`" class="row">
            <span class="row__main">
              <span class="row__label">{{ letter.label }}</span>
            </span>
            <span
              class="row__status"
              :class="`row__status--${letterStatus(letter.pageFills).tone}`"
            >
              <span class="row__dot" aria-hidden="true" />
              {{ letterStatus(letter.pageFills).text }}
            </span>
            <span class="row__meta">{{ letter.jobTitle || letter.company }}</span>
          </NuxtLink>
        </li>
      </ul>

      <p v-else class="group__empty">No cover letters yet.</p>

      <NuxtLink
        v-if="letters.length > latestLetters.length"
        to="/desk/cover-letters"
        class="text-link group__action"
      >
        All {{ letters.length }} letters
      </NuxtLink>
    </section>
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

.group {
  display: grid;
  gap: var(--space-4);
}

.group__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
}

.group__action {
  justify-self: start;
  font-size: var(--text-sm);
}

.group__empty {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: var(--space-3);
  padding: 0;
  margin: 0;
  list-style: none;
}

.stat {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  transition: border-color var(--transition-fast);
}

.stat:hover {
  border-color: var(--color-accent);
}

.stat__count {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
}

.stat__label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.rows {
  display: grid;
  padding: 0;
  margin: 0;
  border-top: 1px solid var(--color-border);
  list-style: none;
}

.row {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  transition: background-color var(--transition-fast);
}

.row:hover {
  background-color: var(--color-hover);
}

@media (min-width: 48rem) {
  .row {
    grid-template-columns: minmax(0, 1fr) 13rem 11rem;
    align-items: center;
    gap: var(--space-4);
  }
}

.row__main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.row__label {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.row__status,
.row__meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
}

.row__dot {
  flex: none;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: var(--radius-full);
  background-color: var(--color-border-strong);
}

.row__status--ok .row__dot {
  background-color: var(--color-accent);
}

.row__status--warn {
  color: var(--color-signal);
}

.row__status--warn .row__dot {
  background-color: var(--color-signal);
}
</style>
