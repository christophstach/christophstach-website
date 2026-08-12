<script setup lang="ts">
import type { TimelineEntry } from "~/data/cv";

defineProps<{
  entries: TimelineEntry[];
}>();
</script>

<template>
  <ol class="timeline">
    <li
      v-for="entry in entries"
      :key="`${entry.organization}-${entry.from}`"
      class="timeline__item"
    >
      <span class="timeline__marker" :class="{ 'timeline__marker--current': !entry.to }">
        <slot name="icon" />
      </span>

      <h3 class="timeline__title">
        {{ entry.title }}
        <span class="timeline__organization">@ {{ entry.organization }}</span>
      </h3>

      <p class="timeline__meta">
        <time>{{ formatMonth(entry.from) }} – {{ entry.to ? formatMonth(entry.to) : "Now" }}</time>
        <span v-if="entry.location" class="timeline__location">{{ entry.location }}</span>
      </p>

      <ul v-if="entry.tech?.length" class="timeline__tech" aria-label="Technologies">
        <li v-for="tech in entry.tech" :key="tech" class="chip chip--accent">
          {{ tech }}
        </li>
      </ul>

      <ul v-if="bulletsFor('web', entry.bullets).length" class="timeline__bullets">
        <li v-for="bullet in bulletsFor('web', entry.bullets)" :key="bullet">{{ bullet }}</li>
      </ul>

      <p v-if="entry.links?.length" class="timeline__links">
        <a
          v-for="link in entry.links"
          :key="link.href"
          :href="link.href"
          target="_blank"
          rel="noopener"
          class="text-link timeline__link"
        >
          <Icon name="tabler:file-type-pdf" size="16" />
          {{ link.text }}
        </a>
      </p>
    </li>
  </ol>
</template>

<style scoped>
.timeline {
  position: relative;
  margin-left: var(--space-4);
  border-left: 1px dashed var(--color-border-strong);
  list-style: none;
}

.timeline__item {
  position: relative;
  padding-bottom: var(--space-12);
  padding-left: var(--space-10);
}

.timeline__item:last-child {
  padding-bottom: 0;
}

.timeline__marker {
  position: absolute;
  top: 0.1rem;
  left: -1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--space-8);
  height: var(--space-8);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-soft);
  box-shadow: 0 0 0 5px var(--color-bg);
}

.timeline__marker--current {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-contrast);
  box-shadow:
    0 0 0 5px var(--color-bg),
    var(--glow-accent);
}

.timeline__title {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.timeline__organization {
  display: block;
  margin-top: var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-regular);
  color: var(--color-accent);
}

.timeline__meta {
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-muted);
}

.timeline__location::before {
  content: " // ";
}

.timeline__tech {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5);
  margin-top: var(--space-3);
  list-style: none;
}

.timeline__bullets {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
  list-style: none;
  font-size: var(--text-base);
  line-height: var(--leading-snug);
  color: var(--color-text-soft);
}

.timeline__bullets li {
  position: relative;
  padding-left: var(--space-5);
}

.timeline__bullets li::before {
  content: "+";
  position: absolute;
  left: 0;
  font-family: var(--font-mono);
  color: var(--color-accent);
}

.timeline__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-3);
  font-size: var(--text-sm);
}

.timeline__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
}
</style>
