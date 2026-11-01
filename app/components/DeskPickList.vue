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
    <p v-if="!dense" class="picks__head">
      <span>picked · {{ pickedItems.length }}</span>
      <span class="picks__hint">in print order, drag to reorder</span>
    </p>

    <ol v-if="pickedItems.length" class="picks__list" :aria-label="`${label}, picked`">
      <li
        v-for="item in pickedItems"
        :key="item.id"
        class="picks__item"
        :class="{
          'picks__item--dragged': drag.dragged.value === item.id,
          'picks__item--open': expandable && open.has(item.id),
        }"
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

          <button
            v-if="expandable"
            type="button"
            class="picks__toggle"
            :aria-expanded="open.has(item.id)"
            :aria-label="`${open.has(item.id) ? 'Close' : 'Open'} ${item.title}`"
            @click="toggleOpen(item.id)"
          >
            <span v-if="item.meta">{{ item.meta }}</span>
            <Icon
              :name="open.has(item.id) ? 'tabler:chevron-up' : 'tabler:chevron-down'"
              size="16"
            />
          </button>
          <span v-else-if="item.meta" class="picks__meta">{{ item.meta }}</span>
        </div>

        <div v-if="expandable && open.has(item.id)" class="picks__detail">
          <slot name="detail" :item="item" />
        </div>
      </li>
    </ol>

    <p v-else-if="!dense && items.length" class="picks__none">Nothing picked yet.</p>

    <template v-if="otherItems.length">
      <p v-if="!dense" class="picks__head picks__head--off">
        <span>not picked · {{ otherItems.length }}</span>
      </p>

      <ul class="picks__list picks__list--off" :aria-label="`${label}, not picked`">
        <li v-for="item in otherItems" :key="item.id" class="picks__item">
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
    </template>

    <p v-if="!items.length" class="picks__none">Nothing to pick yet.</p>
  </div>
</template>

<style scoped>
/* One card; picked and not-picked items are rows in it, divided by rules. */
.picks {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.picks__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-1) var(--space-4);
  padding: var(--space-2-5) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.picks__head--off {
  border-top: 1px solid var(--color-border-strong);
  color: var(--color-text-muted);
}

.picks__hint {
  font-weight: var(--font-regular);
  color: var(--color-text-muted);
}

.picks__list {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}

.picks__item + .picks__item {
  border-top: 1px solid var(--color-border);
}

.picks__item--dragged {
  background-color: var(--color-hover);
  opacity: 0.6;
}

.picks__list--off {
  background-color: var(--color-bg);
  color: var(--color-text-muted);
}

.picks__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-2);
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
  flex: 1 1 12rem;
  align-items: baseline;
  gap: var(--space-3);
  min-inline-size: 0;
  cursor: pointer;
}

.picks__check input {
  flex: none;
  accent-color: var(--color-accent);
}

.picks__text {
  display: grid;
  gap: 0.125rem;
  min-inline-size: 0;
}

.picks__title {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.picks__list--off .picks__title {
  font-weight: var(--font-regular);
  color: inherit;
}

.picks__sub {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.picks__meta,
.picks__toggle {
  flex: none;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.picks__toggle {
  display: inline-flex;
  margin-inline-start: auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1-5) var(--space-2-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: none;
  cursor: pointer;
}

.picks__toggle:hover,
.picks__toggle[aria-expanded="true"] {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.picks__detail {
  padding: 0 var(--space-3) var(--space-3);
}

@media (min-width: 40rem) {
  .picks__detail {
    padding: 0 var(--space-4) var(--space-4) var(--space-10);
  }
}

.picks__none {
  padding: var(--space-4) var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* Inside another list's detail: a plain inset list, no card head. */
.picks--dense {
  border-color: var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
}

.picks--dense .picks__list + .picks__list--off {
  border-top: 1px dashed var(--color-border-strong);
}

.picks--dense .picks__check {
  flex-basis: 0;
}

.picks--dense .picks__row {
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-1);
  font-size: var(--text-sm);
}

.picks--dense .picks__title {
  font-weight: var(--font-regular);
  line-height: var(--leading-relaxed);
}
</style>
