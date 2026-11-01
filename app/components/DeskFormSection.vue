<script setup lang="ts">
const {
  title,
  description = "",
  single = false,
} = defineProps<{
  title: string;
  /** One or two sentences beside the title on wide screens, above the card on narrow ones. */
  description?: string;
  /** One column inside the card, for lists; two columns of fields otherwise. */
  single?: boolean;
}>();
</script>

<!-- A titled block of a desk form: the title and its explanation on the left,
     the fields in a card on the right. Sections are divided by a rule. -->
<template>
  <section class="form-section">
    <div class="form-section__head">
      <h2 class="form-section__title">{{ title }}</h2>
      <p v-if="description" class="form-section__text">{{ description }}</p>
      <slot name="aside" />
    </div>

    <div class="form-section__card" :class="{ 'form-section__card--single': single }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.form-section {
  display: grid;
  gap: var(--space-4);
  padding-block: var(--space-8);
  border-top: 1px solid var(--color-rule);
}

@media (min-width: 64rem) {
  .form-section {
    grid-template-columns: 15rem minmax(0, 1fr);
    gap: var(--space-10);
  }
}

.form-section__head {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}

.form-section__title {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.form-section__text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-muted);
}

.form-section__card {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

@media (min-width: 40rem) {
  .form-section__card:not(.form-section__card--single) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
</style>
