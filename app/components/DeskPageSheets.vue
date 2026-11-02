<script setup lang="ts">
import { percent } from "~/utils/cv-layout";

const { pages } = defineProps<{
  /** How full each page of a PDF is, 0 to 1. */
  pages: { fill: number }[];
}>();
</script>

<!-- Each page as a small A4 sheet, filled as far down as its text runs. -->
<template>
  <ol class="sheets">
    <li
      v-for="(page, index) in pages"
      :key="index"
      class="sheets__page"
      :aria-label="`Page ${index + 1}: ${percent(page.fill)} full`"
    >
      <span class="sheets__sheet" aria-hidden="true">
        <span class="sheets__fill" :style="{ blockSize: `${page.fill * 100}%` }" />
      </span>
      <span class="sheets__value" aria-hidden="true">{{ percent(page.fill) }}</span>
    </li>
  </ol>
</template>

<style scoped>
.sheets {
  display: flex;
  gap: var(--space-3);
  padding: 0;
  margin: 0;
  list-style: none;
}

.sheets__page {
  display: grid;
  justify-items: center;
  gap: var(--space-1-5);
}

.sheets__sheet {
  display: block;
  inline-size: 4.25rem;
  aspect-ratio: 210 / 297;
  padding: 0.4rem;
  border-radius: 2px;
  background-color: var(--color-paper);
  box-shadow: var(--color-paper-shadow);
}

/* Text lines drawn as stripes, down to where the page's text ends. */
.sheets__fill {
  display: block;
  inline-size: 100%;
  background: repeating-linear-gradient(
    to bottom,
    var(--color-paper-rule) 0 2px,
    transparent 2px 5px
  );
}

.sheets__value {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}
</style>
