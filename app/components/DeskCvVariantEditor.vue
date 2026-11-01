<script setup lang="ts">
import type { CvVariant, EntryPick } from "~/data/cv-variants";
import { computed, ref, toRaw } from "vue";
import { education, experience, skills } from "~/data/cv";

type Section = "experience" | "education";
type Entry = (typeof experience)[number];

const { variant, primary } = defineProps<{
  /** The stored variant; the editor works on a copy until it is saved. */
  variant: CvVariant;
  primary: boolean;
}>();

const emit = defineEmits<{
  /** Something was written; the desk reloads and selects this variant. */
  changed: [id: string];
}>();

const sections: { id: Section; entries: Entry[] }[] = [
  { id: "experience", entries: experience },
  { id: "education", entries: education },
];

const draft = ref<CvVariant>(structuredClone(toRaw(variant)));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(variant));
const busy = ref(false);
const errorText = ref("");
const copyId = ref("");

function pickOf(section: Section, id: string): EntryPick | undefined {
  return draft.value[section].find((pick) => pick.id === id);
}

/** Picked entries in print order, then the rest in cv.ts order. */
function entryRows(section: Section, entries: Entry[]) {
  const picked = draft.value[section].flatMap((pick) =>
    entries.filter((entry) => entry.id === pick.id),
  );

  return [...picked, ...entries.filter((entry) => !pickOf(section, entry.id))];
}

/** Picked bullets in print order, then the rest in cv.ts order. */
function bulletRows(entry: Entry, pick: EntryPick | undefined) {
  const all = Object.keys(entry.bullets ?? {});
  const picked = pick?.bullets ?? [];

  return [...picked, ...all.filter((id) => !picked.includes(id))];
}

function toggleEntry(section: Section, entry: Entry) {
  const picks = draft.value[section];
  const index = picks.findIndex((pick) => pick.id === entry.id);

  if (index === -1) {
    picks.push({ id: entry.id, bullets: Object.keys(entry.bullets ?? {}) });
  } else {
    picks.splice(index, 1);
  }
}

function toggle(list: string[], id: string) {
  const index = list.indexOf(id);

  if (index === -1) {
    list.push(id);
  } else {
    list.splice(index, 1);
  }
}

/** Moves an item one place up (-1) or down (+1); does nothing at the ends. */
function move<Item>(list: Item[], index: number, step: -1 | 1) {
  const target = index + step;

  if (target >= 0 && target < list.length) {
    const [item] = list.splice(index, 1) as [Item];

    list.splice(target, 0, item);
  }
}

function moveEntry(section: Section, id: string, step: -1 | 1) {
  const picks = draft.value[section];

  move(
    picks,
    picks.findIndex((pick) => pick.id === id),
    step,
  );
}

function errorMessage(error: unknown): string {
  const failure = error as { data?: { message?: string }; message?: string };

  return failure.data?.message ?? failure.message ?? String(error);
}

/** Runs one write against the desk API and reports it to the desk page. */
async function write(request: () => Promise<unknown>, selectId: string) {
  busy.value = true;
  errorText.value = "";

  try {
    await request();
    emit("changed", selectId);
  } catch (error) {
    errorText.value = errorMessage(error);
  } finally {
    busy.value = false;
  }
}

const url = computed(() => `/api/desk/cv-variants/${variant.id}`);

function save() {
  return write(() => $fetch(url.value, { method: "PUT", body: draft.value }), variant.id);
}

function makePrimary() {
  return write(() => $fetch(`${url.value}/primary`, { method: "POST" }), variant.id);
}

function remove() {
  // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
  if (!confirm(`Delete the variant "${variant.label}"?`)) {
    return Promise.resolve();
  }

  return write(() => $fetch(url.value, { method: "DELETE" }), "");
}

/** Saves the current draft, unsaved edits included, as a new variant. */
function copy() {
  const id = copyId.value.trim();
  const body = { ...draft.value, label: `${draft.value.label} (copy)` };

  return write(() => $fetch(`/api/desk/cv-variants/${id}`, { method: "POST", body }), id);
}

function reset() {
  draft.value = structuredClone(toRaw(variant));
  errorText.value = "";
}
</script>

<template>
  <form class="editor" @submit.prevent="save">
    <div class="editor__fields">
      <label class="editor__field">
        <span class="editor__key">label</span>
        <input v-model="draft.label" class="editor__input" required />
      </label>
      <label class="editor__field">
        <span class="editor__key">role</span>
        <input v-model="draft.role" class="editor__input" required />
      </label>
      <label class="editor__field">
        <span class="editor__key">summary</span>
        <textarea v-model="draft.summary" class="editor__input" rows="3" />
      </label>
    </div>

    <fieldset v-for="section in sections" :key="section.id" class="editor__group">
      <legend class="editor__key">{{ section.id }}</legend>

      <ol class="editor__entries">
        <li
          v-for="entry in entryRows(section.id, section.entries)"
          :key="entry.id"
          class="editor__entry"
          :class="{ 'editor__entry--off': !pickOf(section.id, entry.id) }"
        >
          <div class="editor__row">
            <label class="editor__check">
              <input
                type="checkbox"
                :checked="Boolean(pickOf(section.id, entry.id))"
                @change="toggleEntry(section.id, entry)"
              />
              <span class="editor__entry-title">{{ entry.title }}</span>
              <span class="editor__entry-org">{{ entry.organization }}</span>
            </label>
            <span v-if="pickOf(section.id, entry.id)" class="editor__moves">
              <button
                type="button"
                class="icon-button"
                :aria-label="`Move ${entry.title} up`"
                @click="moveEntry(section.id, entry.id, -1)"
              >
                <Icon name="tabler:arrow-up" size="14" />
              </button>
              <button
                type="button"
                class="icon-button"
                :aria-label="`Move ${entry.title} down`"
                @click="moveEntry(section.id, entry.id, 1)"
              >
                <Icon name="tabler:arrow-down" size="14" />
              </button>
            </span>
          </div>

          <ol v-if="pickOf(section.id, entry.id)" class="editor__bullets">
            <li
              v-for="bulletId in bulletRows(entry, pickOf(section.id, entry.id))"
              :key="bulletId"
              class="editor__row"
              :class="{
                'editor__bullet--off': !pickOf(section.id, entry.id)?.bullets.includes(bulletId),
              }"
            >
              <label class="editor__check">
                <input
                  type="checkbox"
                  :checked="pickOf(section.id, entry.id)?.bullets.includes(bulletId)"
                  @change="toggle(pickOf(section.id, entry.id)!.bullets, bulletId)"
                />
                <span class="editor__bullet">{{ entry.bullets?.[bulletId] }}</span>
              </label>
              <span
                v-if="pickOf(section.id, entry.id)?.bullets.includes(bulletId)"
                class="editor__moves"
              >
                <button
                  type="button"
                  class="icon-button"
                  aria-label="Move bullet up"
                  @click="
                    move(
                      pickOf(section.id, entry.id)!.bullets,
                      pickOf(section.id, entry.id)!.bullets.indexOf(bulletId),
                      -1,
                    )
                  "
                >
                  <Icon name="tabler:arrow-up" size="14" />
                </button>
                <button
                  type="button"
                  class="icon-button"
                  aria-label="Move bullet down"
                  @click="
                    move(
                      pickOf(section.id, entry.id)!.bullets,
                      pickOf(section.id, entry.id)!.bullets.indexOf(bulletId),
                      1,
                    )
                  "
                >
                  <Icon name="tabler:arrow-down" size="14" />
                </button>
              </span>
            </li>
          </ol>
        </li>
      </ol>
    </fieldset>

    <fieldset class="editor__group">
      <legend class="editor__key">skills</legend>
      <div class="editor__skills">
        <label v-for="group in skills" :key="group.label" class="editor__check">
          <input
            type="checkbox"
            :checked="draft.skills.includes(group.label)"
            @change="toggle(draft.skills, group.label)"
          />
          {{ group.title }}
        </label>
      </div>
    </fieldset>

    <p v-if="errorText" class="editor__error" role="alert">{{ errorText }}</p>

    <div class="editor__actions">
      <button type="submit" class="button button--primary" :disabled="busy || !dirty">
        {{ busy ? "Saving…" : "Save" }}
      </button>
      <button type="button" class="button button--outline" :disabled="!dirty" @click="reset">
        Discard changes
      </button>
      <button
        v-if="!primary"
        type="button"
        class="button button--outline"
        :disabled="busy || dirty"
        @click="makePrimary"
      >
        Make primary
      </button>
      <button
        v-if="!primary"
        type="button"
        class="button button--outline"
        :disabled="busy"
        @click="remove"
      >
        Delete
      </button>
    </div>

    <div class="editor__copy">
      <label class="editor__field">
        <span class="editor__key">copy as</span>
        <input
          v-model="copyId"
          class="editor__input"
          placeholder="new-variant-id"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
        />
      </label>
      <button
        type="button"
        class="button button--outline"
        :disabled="busy || !copyId.trim()"
        @click="copy"
      >
        Copy to new variant
      </button>
    </div>
  </form>
</template>

<style scoped>
.editor {
  display: grid;
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.editor__fields {
  display: grid;
  gap: var(--space-3);
}

.editor__field {
  display: grid;
  gap: var(--space-1);
}

@media (min-width: 40rem) {
  .editor__field {
    grid-template-columns: 9rem 1fr;
    align-items: baseline;
    gap: var(--space-6);
  }
}

.editor__key {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.editor__input {
  inline-size: 100%;
  padding: var(--space-1-5) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}

.editor__input:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 1px;
}

.editor__group {
  padding: 0;
  margin: 0;
  border: 0;
}

.editor__group legend {
  margin-bottom: var(--space-2);
}

.editor__entries,
.editor__bullets {
  display: grid;
  gap: var(--space-1);
  padding: 0;
  margin: 0;
  list-style: none;
}

.editor__entry {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.editor__entry--off,
.editor__bullet--off {
  color: var(--color-text-muted);
}

.editor__entry--off {
  border-style: dashed;
}

.editor__bullets {
  margin: var(--space-2) 0 0 var(--space-6);
}

.editor__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

/* The checkbox keeps its own column, so long bullets wrap beside it. */
.editor__check {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  cursor: pointer;
}

.editor__entry-title {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.editor__entry--off .editor__entry-title {
  color: inherit;
}

.editor__entry-org {
  font-size: var(--text-sm);
}

.editor__bullet {
  font-size: var(--text-sm);
}

.editor__moves {
  display: inline-flex;
  flex-shrink: 0;
  gap: var(--space-1);
}

.editor__skills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
}

.editor__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.editor__actions,
.editor__copy {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.editor__copy .editor__field {
  flex: 1 1 20rem;
}
</style>
