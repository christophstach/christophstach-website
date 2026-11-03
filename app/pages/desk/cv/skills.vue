<script setup lang="ts">
import { computed, ref } from "vue";
import { refreshNuxtData, useFetch, useSeoMeta } from "nuxt/app";
import { useDeskRequest } from "~/utils/desk-request";
import { useDragReorder } from "~/utils/drag-reorder";
import { usePageChecks } from "~/utils/desk-page-checks";
import { useUnsavedGuard } from "~/utils/desk-unsaved";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Skills · CV · Desk",
  robots: "noindex, nofollow",
});

const { data: content } = await useFetch("/api/desk/cv-content", { key: "desk-cv-content" });
const { data: variants } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });

interface GroupForm {
  label: string;
  /** Desk only. */
  name: string;
  /** Desk only. */
  note: string;
  title: string;
  /** Comma-separated. */
  items: string;
  /** Not saved yet, so its id can still change. */
  isNew?: boolean;
}

function toForm(): GroupForm[] {
  return (content.value?.skills ?? []).map((group) => ({
    label: group.label,
    name: group.name,
    note: group.note,
    title: group.title,
    items: group.items.join(", "),
  }));
}

const draft = ref<GroupForm[]>(toForm());
const saved = computed(() => toForm());
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));

useUnsavedGuard(() => dirty.value);

/** Names of the variants that print this skill group. */
function usedBy(label: string): string[] {
  return (variants.value?.variants ?? [])
    .filter((variant) => variant.skills.includes(label))
    .map((variant) => variant.label);
}

const drag = useDragReorder(
  () => draft.value.map((group) => group.label),
  (labels) => {
    draft.value = labels.flatMap(
      (label) => draft.value.find((group) => group.label === label) ?? [],
    );
  },
);

function addGroup() {
  draft.value.push({ label: "", name: "", note: "", title: "", items: "", isNew: true });
}

function removeGroup(index: number) {
  const group = draft.value[index];
  const users = group ? usedBy(group.label) : [];

  // oxlint-disable-next-line no-alert -- a desk-only safety net before dropping printed skills
  if (users.length > 0 && !confirm(`${users.join(", ")} print this group. Remove it anyway?`)) {
    return;
  }

  draft.value.splice(index, 1);
}

const request = useDeskRequest();
const pageChecks = usePageChecks();

async function save() {
  const body = draft.value.map((group) => ({
    label: group.label.trim(),
    name: group.name,
    note: group.note,
    title: group.title,
    items: group.items.split(","),
  }));

  if (await request.run(() => $fetch("/api/desk/skill-groups", { method: "PUT", body }))) {
    await refreshNuxtData(["desk-cv-content", "desk-cv-variants"]);
    pageChecks.forget();
    draft.value = toForm();
  }
}

function discard() {
  draft.value = toForm();
  request.error.value = "";
}
</script>

<template>
  <form class="desk-page" @submit.prevent="save">
    <header class="desk-head">
      <div class="desk-head__text">
        <p class="desk-head__path"><NuxtLink to="/desk/cv">~/desk/cv</NuxtLink> / skills</p>
        <h1 class="desk-head__title">Skills</h1>
        <p class="desk-head__sub">
          The home page shows every group in this order; variants pick which ones the PDF prints.
        </p>
      </div>

      <button type="button" class="button button--outline" @click="addGroup">
        <Icon name="tabler:plus" size="16" />
        Add group
      </button>
    </header>

    <p v-if="request.error.value && !dirty" class="desk-error" role="alert">
      {{ request.error.value }}
    </p>

    <ol class="groups">
      <li
        v-for="(group, index) in draft"
        :key="group.isNew ? `new-${index}` : group.label"
        class="group panel"
        :class="{ 'group--dragged': drag.dragged.value === group.label }"
        :draggable="!group.isNew"
        @dragstart="drag.start(group.label, $event)"
        @dragover.prevent="drag.over(group.label)"
        @drop.prevent
        @dragend="drag.end()"
      >
        <div class="group__head">
          <button
            type="button"
            class="group__handle"
            :aria-label="`Move ${group.name || group.title || 'group'}: arrow up or down`"
            title="Drag, or use the arrow keys"
            @keydown="!group.isNew && drag.key(group.label, $event)"
          >
            <Icon name="tabler:grip-vertical" size="16" />
          </button>
          <span class="group__name">{{ group.name || group.title || "New group" }}</span>
          <span class="group__used">
            {{
              usedBy(group.label).length ? `in ${usedBy(group.label).join(", ")}` : "in no variant"
            }}
          </span>
          <button
            type="button"
            class="icon-button"
            aria-label="Remove group"
            title="Remove group"
            @click="removeGroup(index)"
          >
            <Icon name="tabler:trash" size="16" />
          </button>
        </div>

        <div class="group__fields">
          <label class="field">
            <span class="field__label">name</span>
            <input v-model="group.name" class="input" required />
            <span class="field__hint">Only the desk shows the name and the note.</span>
          </label>
          <label class="field">
            <span class="field__label">note</span>
            <textarea
              v-model="group.note"
              class="input"
              rows="1"
              placeholder="What this group is for."
            />
          </label>
          <label class="field">
            <span class="field__label">id</span>
            <input
              v-if="group.isNew"
              v-model="group.label"
              class="input"
              required
              pattern="[a-z0-9][a-z0-9_\-]*"
              placeholder="cloud"
            />
            <span v-else class="group__id">{{ group.label }}</span>
          </label>
          <label class="field">
            <span class="field__label">title</span>
            <input v-model="group.title" class="input" required />
            <span class="field__hint">The heading the CV prints.</span>
          </label>
          <label class="field field--wide">
            <span class="field__label">skills</span>
            <textarea v-model="group.items" class="input" rows="2" />
            <span class="field__hint">Comma-separated, in display order.</span>
          </label>
        </div>
      </li>
    </ol>

    <DeskSaveBar
      v-if="dirty"
      :busy="request.busy.value"
      :error="request.error.value"
      @discard="discard"
    />
  </form>
</template>

<style scoped>
.groups {
  display: grid;
  gap: var(--space-6);
  padding: 0;
  margin: 0;
  list-style: none;
}

@media (min-width: 80rem) {
  .groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.group {
  align-content: start;
}

.group--dragged {
  border-color: var(--color-accent);
  opacity: 0.6;
}

.group__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-3);
  border-bottom: 1px solid var(--color-border-strong);
}

.group__handle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 2rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text-muted);
  cursor: grab;
}

.group__handle:hover,
.group__handle:focus-visible {
  color: var(--color-accent);
}

.group__name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.group__used {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group__fields {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

@media (min-width: 40rem) {
  .group__fields {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: start;
  }
}

.group__id {
  padding-block: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-heading);
}
</style>
