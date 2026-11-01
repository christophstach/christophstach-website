<script setup lang="ts">
import { computed, ref } from "vue";
import { useDragReorder } from "~/utils/drag-reorder";

/** Something a variant can pick: an entry, a bullet, a project, a skill group. */
interface PickItem {
  id: string;
  title: string;
  /** Second line or trailing text, e.g. the organization. */
  sub?: string;
  /** Short status on the right, e.g. "6/9 bullets". */
  meta?: string;
}

const {
  items,
  label,
  expandable = false,
  dense = false,
} = defineProps<{
  /** Everything that can be picked, in its own order. */
  items: PickItem[];
  /** What the list holds, for screen readers, e.g. "Experience". */
  label: string;
  /** Picked items can open to show the `detail` slot. */
  expandable?: boolean;
  /** Smaller rows, for a list inside another one's detail. */
  dense?: boolean;
}>();

/** Picked ids, in print order. */
const picked = defineModel<string[]>({ required: true });

const byId = computed(() => new Map(items.map((item) => [item.id, item])));
const pickedItems = computed(() => picked.value.flatMap((id) => byId.value.get(id) ?? []));
const otherItems = computed(() => items.filter((item) => !picked.value.includes(item.id)));

const drag = useDragReorder(
  () => picked.value,
  (ids) => {
    picked.value = ids;
  },
);

const open = ref(new Set<string>());

function toggleOpen(id: string) {
  const next = new Set(open.value);

  if (!next.delete(id)) {
    next.add(id);
  }

  open.value = next;
}

function pick(id: string) {
  picked.value = [...picked.value, id];
}

function unpick(id: string) {
  picked.value = picked.value.filter((other) => other !== id);
}
</script>

<template>
  <div class="picks" :class="{ 'picks--dense': dense }">
    <ol v-if="pickedItems.length" class="picks__list" :aria-label="`${label}, picked`">
      <li
        v-for="item in pickedItems"
        :key="item.id"
        class="picks__item"
        :class="{ 'picks__item--dragged': drag.dragged.value === item.id }"
        draggable="true"
        @dragstart.stop="drag.start(item.id, $event)"
        @dragover.prevent.stop="drag.over(item.id)"
        @drop.prevent.stop
        @dragend.stop="drag.end()"
      >
        <div class="picks__row">
          <button
            type="button"
            class="picks__handle"
            :aria-label="`Move ${item.title}: arrow up or down`"
            title="Drag, or use the arrow keys"
            @keydown="drag.key(item.id, $event)"
          >
            <Icon name="tabler:grip-vertical" size="16" />
          </button>

          <label class="picks__check">
            <input type="checkbox" checked @change="unpick(item.id)" />
            <span class="picks__text">
              <span class="picks__title">{{ item.title }}</span>
              <span v-if="item.sub" class="picks__sub">{{ item.sub }}</span>
            </span>
          </label>

          <span v-if="item.meta" class="picks__meta">{{ item.meta }}</span>

          <button
            v-if="expandable"
            type="button"
            class="icon-button picks__toggle"
            :aria-expanded="open.has(item.id)"
            :aria-label="`${open.has(item.id) ? 'Close' : 'Open'} ${item.title}`"
            @click="toggleOpen(item.id)"
          >
            <Icon
              :name="open.has(item.id) ? 'tabler:chevron-up' : 'tabler:chevron-down'"
              size="16"
            />
          </button>
        </div>

        <div v-if="expandable && open.has(item.id)" class="picks__detail">
          <slot name="detail" :item="item" />
        </div>
      </li>
    </ol>

    <ul v-if="otherItems.length" class="picks__list" :aria-label="`${label}, not picked`">
      <li v-for="item in otherItems" :key="item.id" class="picks__item picks__item--off">
        <div class="picks__row">
          <span class="picks__handle picks__handle--off" aria-hidden="true" />

          <label class="picks__check">
            <input type="checkbox" @change="pick(item.id)" />
            <span class="picks__text">
              <span class="picks__title">{{ item.title }}</span>
              <span v-if="item.sub" class="picks__sub">{{ item.sub }}</span>
            </span>
          </label>
        </div>
      </li>
    </ul>

    <p v-if="!items.length" class="picks__empty">Nothing to pick yet.</p>
  </div>
</template>

<style scoped>
.picks {
  display: grid;
  gap: var(--space-2);
}

.picks__list {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.picks__item {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.picks__item--dragged {
  border-color: var(--color-accent);
  opacity: 0.6;
}

.picks__item--off {
  border-style: dashed;
  border-color: var(--color-border);
  background: none;
  color: var(--color-text-muted);
}

.picks__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2-5) var(--space-3);
}

.picks__handle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-muted);
  cursor: grab;
}

.picks__handle:hover,
.picks__handle:focus-visible {
  color: var(--color-accent);
}

.picks__handle--off {
  cursor: default;
}

/* The checkbox keeps its own column, so long text wraps beside it. */
.picks__check {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: var(--space-2-5);
  min-inline-size: 0;
  cursor: pointer;
}

.picks__check input {
  flex: none;
  accent-color: var(--color-accent);
}

.picks__text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--space-2);
  min-inline-size: 0;
}

.picks__title {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.picks__item--off .picks__title {
  font-weight: var(--font-regular);
  color: inherit;
}

.picks__sub {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.picks__meta {
  flex: none;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.picks__toggle {
  flex: none;
}

.picks__detail {
  padding: var(--space-1) var(--space-3) var(--space-3) var(--space-10);
}

.picks--dense .picks__list {
  gap: var(--space-1);
}

.picks--dense .picks__item {
  border-radius: var(--radius-md);
}

.picks--dense .picks__row {
  padding: var(--space-1-5) var(--space-2);
  font-size: var(--text-sm);
}

.picks--dense .picks__title {
  font-weight: var(--font-regular);
}

.picks__empty {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
