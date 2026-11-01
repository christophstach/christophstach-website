<script setup lang="ts">
/** A link under a sidebar section, e.g. one CV variant. */
interface SubnavItem {
  to: string;
  label: string;
  /** Short role tag on the right, e.g. "pdf". */
  tag?: string;
}

const { items, label, add } = defineProps<{
  items: SubnavItem[];
  /** What the links are, for screen readers, e.g. "CV variants". */
  label: string;
  /** The "new …" link at the end. */
  add: { to: string; label: string };
}>();
</script>

<template>
  <ul class="subnav" :aria-label="label">
    <li v-for="item in items" :key="item.to">
      <NuxtLink :to="item.to" class="subnav__link" exact-active-class="subnav__link--active">
        <span class="subnav__label">{{ item.label }}</span>
        <span v-if="item.tag" class="subnav__tag">{{ item.tag }}</span>
      </NuxtLink>
    </li>
    <li>
      <NuxtLink :to="add.to" class="subnav__link subnav__link--add">
        <Icon name="tabler:plus" size="14" />
        {{ add.label }}
      </NuxtLink>
    </li>
  </ul>
</template>

<style scoped>
.subnav {
  display: grid;
  gap: 1px;
  padding: 0 0 0 var(--space-3);
  margin: var(--space-1) 0 var(--space-2) 1.1rem;
  border-left: 1px solid var(--color-border-strong);
  list-style: none;
}

.subnav__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text-soft);
  font-size: var(--text-xs);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.subnav__label {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subnav__link:hover {
  background-color: var(--color-hover);
  color: var(--color-hover-text);
}

.subnav__link--active,
.subnav__link--active:hover {
  background-color: var(--color-accent-subtle-bg);
  color: var(--color-accent-subtle-text);
}

.subnav__tag {
  flex: none;
  color: var(--color-accent);
}

.subnav__link--add {
  justify-content: flex-start;
  gap: var(--space-1-5);
  color: var(--color-text-muted);
}
</style>
