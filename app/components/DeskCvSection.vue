<script setup lang="ts">
const {
  id,
  label,
  count = 0,
} = defineProps<{
  id: string;
  label: string;
  /** Number of entries, shown next to the heading when non-zero. */
  count?: number;
}>();
</script>

<template>
  <section :id="id" class="cv-section" :aria-labelledby="`${id}-heading`">
    <h2 :id="`${id}-heading`" class="cv-section__heading">
      <span class="section-label">{{ label }}</span>
      <span v-if="count > 0" class="cv-section__count">{{ count }}</span>
    </h2>

    <div class="cv-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.cv-section {
  scroll-margin-top: var(--space-6);
}

.cv-section__heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.cv-section__count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.cv-section__body {
  margin-top: var(--space-2);
}
</style>
