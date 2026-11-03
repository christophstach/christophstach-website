<script setup lang="ts">
import { ref, useId } from "vue";

/** One action in the menu; `danger` marks a destructive one. */
interface MenuAction {
  label: string;
  icon: string;
  run: () => unknown;
  danger?: boolean;
}

const { actions, label = "More actions" } = defineProps<{
  actions: MenuAction[];
  label?: string;
}>();

const id = useId();
const button = ref<HTMLButtonElement>();
const menu = ref<HTMLElement>();
const position = ref({ top: "0px", left: "0px" });

// A popover sits in the top layer and closes on outside clicks and Escape by
// itself; it only needs placing under its button when it opens.
function place(event: Event) {
  const rect = button.value?.getBoundingClientRect();

  if ((event as ToggleEvent).newState === "open" && rect) {
    position.value = {
      top: `${rect.bottom + 6}px`,
      left: `${Math.max(8, rect.right - (menu.value?.offsetWidth ?? 0))}px`,
    };
  }
}

function choose(action: MenuAction) {
  menu.value?.hidePopover();
  action.run();
}
</script>

<template>
  <button
    ref="button"
    type="button"
    class="icon-button"
    :aria-label="label"
    :title="label"
    :popovertarget="id"
  >
    <Icon name="tabler:dots" size="20" />
  </button>

  <div :id="id" ref="menu" popover class="menu" :style="position" @toggle="place">
    <ul class="menu__list">
      <li v-for="action in actions" :key="action.label">
        <button
          type="button"
          class="menu__item"
          :class="{ 'menu__item--danger': action.danger }"
          @click="choose(action)"
        >
          <Icon :name="action.icon" size="16" />
          {{ action.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.menu {
  position: fixed;
  inset: auto;
  min-inline-size: 13rem;
  padding: var(--space-1);
  margin: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-lg);
}

.menu__list {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}

.menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  inline-size: 100%;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text-soft);
  font: inherit;
  font-size: var(--text-sm);
  text-align: start;
  cursor: pointer;
}

.menu__item:hover,
.menu__item:focus-visible {
  background-color: var(--color-hover);
  color: var(--color-hover-text);
}

.menu__item--danger,
.menu__item--danger:hover {
  color: var(--color-danger);
}
</style>
