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
  title: string;
  /** Comma-separated. */
  items: string;
  /** Not saved yet, so its id can still change. */
  isNew?: boolean;
}

function toForm(): GroupForm[] {
  return (content.value?.skills ?? []).map((group) => ({
    label: group.label,
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
  draft.value.push({ label: "", title: "", items: "", isNew: true });
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
    title: group.title,
    items: group.items.split(","),
  }));

  if (await request.run(() => $fetch<unknown>("/api/desk/skill-groups", { method: "PUT", body }))) {
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
  <form class="skills" @submit.prevent="save">
    <header class="skills__heading">
      <p class="skills__path">
        <NuxtLink to="/desk/cv" class="skills__crumb">~/desk/cv</NuxtLink> / skills
      </p>
      <h1 class="skills__title">Skills</h1>
      <p class="skills__intro">
        The home page shows every group in this order; variants pick which ones the PDF prints.
      </p>
    </header>

    <p v-if="request.error.value && !dirty" class="skills__error" role="alert">
      {{ request.error.value }}
    </p>

    <ol class="groups">
      <li
        v-for="(group, index) in draft"
        :key="group.isNew ? `new-${index}` : group.label"
        class="group"
        :class="{ 'group--dragged': drag.dragged.value === group.label }"
        :draggable="!group.isNew"
        @dragstart="drag.start(group.label, $event)"
        @dragover.prevent="drag.over(group.label)"
        @drop.prevent
        @dragend="drag.end()"
      >
        <button
          type="button"
          class="group__handle"
          :aria-label="`Move ${group.title || 'group'}: arrow up or down`"
          title="Drag, or use the arrow keys"
          @keydown="!group.isNew && drag.key(group.label, $event)"
        >
          <Icon name="tabler:grip-vertical" size="16" />
        </button>

        <div class="group__fields">
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
          </label>
          <label class="field group__wide">
            <span class="field__label">skills</span>
            <textarea v-model="group.items" class="input" rows="2" />
            <span class="field__hint">
              Comma-separated.
              {{
                usedBy(group.label).length
                  ? `Printed by ${usedBy(group.label).join(", ")}.`
                  : "No variant prints it."
              }}
            </span>
          </label>
        </div>

        <button
          type="button"
          class="icon-button"
          aria-label="Remove group"
          title="Remove group"
          @click="removeGroup(index)"
        >
          <Icon name="tabler:trash" size="16" />
        </button>
      </li>
    </ol>

    <button type="button" class="button button--outline skills__add" @click="addGroup">
      <Icon name="tabler:plus" size="16" />
      Add group
    </button>

    <DeskSaveBar
      v-if="dirty"
      :busy="request.busy.value"
      :error="request.error.value"
      @discard="discard"
    />
  </form>
</template>

<style scoped>
.skills {
  display: grid;
  align-content: start;
  gap: var(--space-6);
  max-inline-size: 52rem;
  padding: var(--space-10) var(--space-6);
}

@media (min-width: 48rem) {
  .skills {
    padding: var(--space-12) var(--space-12);
  }
}

.skills__heading {
  display: grid;
  gap: var(--space-2);
}

.skills__path {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.skills__crumb {
  color: inherit;
}

.skills__crumb:hover {
  color: var(--color-accent);
}

.skills__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.skills__intro {
  color: var(--color-text-soft);
}

.skills__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.skills__add {
  justify-self: start;
}

.groups {
  display: grid;
  gap: var(--space-3);
  padding: 0;
  margin: 0;
  list-style: none;
}

.group {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.group--dragged {
  border-color: var(--color-accent);
  opacity: 0.6;
}

.group__handle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 2.25rem;
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

.group__fields {
  display: grid;
  flex: 1;
  gap: var(--space-4);
  min-inline-size: 0;
}

@media (min-width: 40rem) {
  .group__fields {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: start;
  }

  .group__wide {
    grid-column: 1 / -1;
  }
}

.group__id {
  padding-block: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-heading);
}
</style>
