<script setup lang="ts">
const { busy, error = "" } = defineProps<{
  /** A write is running. */
  busy: boolean;
  /** The last failed write, shown in the bar. */
  error?: string;
}>();

const emit = defineEmits<{
  discard: [];
}>();
</script>

<!-- Sticks to the bottom of the form it sits in; its Save button submits that form. -->
<template>
  <div class="save-bar" role="status">
    <span class="save-bar__dot" aria-hidden="true" />
    <span class="save-bar__text">{{ error || "Unsaved changes" }}</span>
    <button type="button" class="button button--outline" :disabled="busy" @click="emit('discard')">
      Discard
    </button>
    <button type="submit" class="button button--primary" :disabled="busy">
      {{ busy ? "Saving…" : "Save" }}
    </button>
  </div>
</template>

<style scoped>
.save-bar {
  position: sticky;
  bottom: var(--space-4);
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.save-bar__dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: var(--radius-full);
  background-color: var(--color-signal);
}

.save-bar__text {
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}
</style>
