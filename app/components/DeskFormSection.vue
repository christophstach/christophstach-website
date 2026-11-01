<script setup lang="ts">
const {
  title,
  description = "",
  single = false,
} = defineProps<{
  title: string;
  /** A short line beside the title. */
  description?: string;
  /** One column, for lists; two columns of fields otherwise. */
  single?: boolean;
}>();
</script>

<!-- A titled block of a desk form: a panel with the title and its
     explanation in a head row, the fields below. -->
<template>
  <section class="panel form-section">
    <header class="panel__head">
      <h2 class="panel__title">{{ title }}</h2>
      <p v-if="description" class="panel__note">{{ description }}</p>
      <slot name="aside" />
    </header>

    <div class="panel__body form-section__body" :class="{ 'form-section__body--single': single }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.form-section__body {
  display: grid;
  gap: var(--space-5);
}

@media (min-width: 40rem) {
  .form-section__body:not(.form-section__body--single) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
</style>
