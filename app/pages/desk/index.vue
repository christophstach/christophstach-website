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
  <div class="desk-page">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path">~/desk</p>
        <h1 class="desk-head__title">Overview</h1>
        <p class="desk-head__sub">What the CVs are built from, and how they print.</p>
      </div>
    </header>

    <div class="panels">
      <section class="panel" aria-labelledby="panel-content">
        <header class="panel__head">
          <h2 id="panel-content" class="panel__title">cv content</h2>
        </header>

        <ul class="stats">
          <li v-for="stat in stats" :key="stat.label">
            <NuxtLink :to="stat.to" class="stat">
              <span class="stat__count">{{ stat.count }}</span>
              <span class="stat__label">{{ stat.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="panel-variants">
        <header class="panel__head">
          <h2 id="panel-variants" class="panel__title">cv variants</h2>
          <NuxtLink to="/desk/cv?new" class="text-link panel__end add-link">New variant</NuxtLink>
        </header>

        <ul v-if="variants.length" class="panel__rows">
          <li v-for="variant in variants" :key="variant.id">
            <NuxtLink :to="`/desk/cv/${variant.id}`" class="panel-row row">
              <span class="row__main">
                <span class="panel-row__label">{{ variant.label }}</span>
                <span v-if="variant.id === primaryId" class="role-tag">PDF</span>
                <span v-if="variant.id === websiteId" class="role-tag">/curriculum</span>
              </span>
              <span class="panel-row__meta">
                <span class="desk-status" :class="`desk-status--${variantStatus(variant).tone}`">
                  {{ variantStatus(variant).text }}
                </span>
              </span>
              <span class="panel-row__meta">{{ formatRelative(variant.updatedAt) }}</span>
            </NuxtLink>
          </li>
        </ul>

        <p v-else class="panel__empty">No CV variants yet.</p>
      </section>

      <section class="panel" aria-labelledby="panel-letters">
        <header class="panel__head">
          <h2 id="panel-letters" class="panel__title">cover letters</h2>
          <NuxtLink
            v-if="letters.length > latestLetters.length"
            to="/desk/cover-letters"
            class="text-link panel__end add-link"
          >
            All {{ letters.length }} letters
          </NuxtLink>
          <NuxtLink
            to="/desk/cover-letters?new"
            class="text-link add-link"
            :class="{ panel__end: letters.length <= latestLetters.length }"
          >
            New letter
          </NuxtLink>
        </header>

        <ul v-if="letters.length" class="panel__rows">
          <li v-for="letter in latestLetters" :key="letter.id">
            <NuxtLink :to="`/desk/cover-letters/${letter.id}`" class="panel-row row">
              <span class="row__main">
                <span class="panel-row__label">{{ letter.label }}</span>
              </span>
              <span class="panel-row__meta">
                <span
                  class="desk-status"
                  :class="`desk-status--${letterStatus(letter.pageFills).tone}`"
                >
                  {{ letterStatus(letter.pageFills).text }}
                </span>
              </span>
              <span class="panel-row__meta">{{ letter.jobTitle || letter.company }}</span>
            </NuxtLink>
          </li>
        </ul>

        <p v-else class="panel__empty">No cover letters yet.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.add-link {
  font-size: var(--text-sm);
}

/* One panel divided into cells. Flex, so the last row of a narrow screen fills
   up with cells instead of leaving a gap in the rules between them. */
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  padding: 0;
  margin: 0;
  overflow: clip;
  border-end-start-radius: var(--radius-lg);
  border-end-end-radius: var(--radius-lg);
  background-color: var(--color-border);
  list-style: none;
}

.stats > li {
  flex: 1 1 7.5rem;
}

.stat {
  display: grid;
  gap: var(--space-1);
  block-size: 100%;
  padding: var(--space-4) var(--space-5);
  background-color: var(--color-surface);
  transition: background-color var(--transition-fast);
}

.stat:hover {
  background-color: var(--color-hover);
}

.stat:focus-visible {
  outline-offset: -2px;
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
</style>
