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

      <time class="timeline__time">
        {{ formatMonth(entry.from) }} – {{ entry.to ? formatMonth(entry.to) : "Now" }}
      </time>

      <ul v-if="entry.tech?.length" class="timeline__tech" aria-label="Technologies">
        <li v-for="tech in entry.tech" :key="tech" class="chip chip--accent">
          {{ tech }}
        </li>
      </ul>

      <ul class="timeline__bullets">
        <li v-for="bullet in entry.bullets" :key="bullet">{{ bullet }}</li>
      </ul>
    </li>
  </ol>
</template>

<style scoped>
.timeline {
  position: relative;
  margin-left: var(--space-4);
  border-left: 1px solid var(--color-border);
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
  top: 0;
  left: -1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--space-8);
  height: var(--space-8);
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  color: var(--color-text-soft);
  box-shadow: 0 0 0 4px var(--color-bg);
}

.timeline__marker--current {
  background-color: var(--color-accent-subtle-bg);
  color: var(--color-accent-subtle-text);
}

.timeline__title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.timeline__organization {
  font-weight: var(--font-regular);
  color: var(--color-text-muted);
}

.timeline__time {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
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
  gap: var(--space-1-5);
  margin-top: var(--space-3);
  padding-left: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}
</style>
