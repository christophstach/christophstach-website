<script setup lang="ts">
import { computed, ref } from "vue";
import { moveId, moveIdTo } from "~/utils/drag-reorder";
import type { CvVariant } from "~/data/cv-variants";
import type { EntryRecord } from "~/data/cv";
import { formatMonth } from "~/utils/format";
import { useFetch } from "nuxt/app";

type Section = "experience" | "education";

/** The variant being edited; the sheet changes its picks and its role and summary. */
const draft = defineModel<CvVariant>({ required: true });

const { data: content } = await useFetch("/api/desk/cv-content", { key: "desk-cv-content" });
const { data: profile } = await useFetch("/api/desk/profile", { key: "desk-profile" });

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//u, "");
}

function period(entry: EntryRecord): string {
  return `${formatMonth(entry.from)} – ${entry.to ? formatMonth(entry.to) : "Present"}`;
}

function entriesOf(section: Section): EntryRecord[] {
  return (content.value?.entries ?? []).filter((entry) => entry.section === section);
}

function pickOf(section: Section, id: string) {
  return draft.value[section].find((pick) => pick.id === id);
}

/** Picked entries in print order, then the ones this variant leaves out. */
function pickedEntries(section: Section): EntryRecord[] {
  return draft.value[section].flatMap(
    (pick) => entriesOf(section).find((entry) => entry.id === pick.id) ?? [],
  );
}

function leftOutEntries(section: Section): EntryRecord[] {
  return entriesOf(section).filter((entry) => !pickOf(section, entry.id));
}

/** An entry's bullets: the printed ones in print order, then the rest, faded. */
function bulletsOf(section: Section, entry: EntryRecord) {
  const chosen = pickOf(section, entry.id)?.bullets ?? [];
  const printed = chosen.flatMap((id) => entry.bullets.find((bullet) => bullet.id === id) ?? []);
  const rest = entry.bullets.filter((bullet) => !chosen.includes(bullet.id));

  return [
    ...printed.map((bullet) => ({ id: bullet.id, text: bullet.text, on: true })),
    ...rest.map((bullet) => ({ id: bullet.id, text: bullet.text, on: false })),
  ];
}

function addEntry(section: Section, entry: EntryRecord) {
  draft.value[section] = [
    ...draft.value[section],
    { id: entry.id, bullets: entry.bullets.map((bullet) => bullet.id) },
  ];
}

function removeEntry(section: Section, id: string) {
  draft.value[section] = draft.value[section].filter((pick) => pick.id !== id);
}

function toggleBullet(section: Section, entryId: string, bulletId: string) {
  const pick = pickOf(section, entryId);

  if (!pick) {
    return;
  }

  pick.bullets = pick.bullets.includes(bulletId)
    ? pick.bullets.filter((id) => id !== bulletId)
    : [...pick.bullets, bulletId];
}

const skillGroups = computed(() => content.value?.skills ?? []);
const pickedSkills = computed(() =>
  draft.value.skills.flatMap(
    (label) => skillGroups.value.find((group) => group.label === label) ?? [],
  ),
);
const leftOutSkills = computed(() =>
  skillGroups.value.filter((group) => !draft.value.skills.includes(group.label)),
);

function toggleSkill(label: string) {
  draft.value.skills = draft.value.skills.includes(label)
    ? draft.value.skills.filter((other) => other !== label)
    : [...draft.value.skills, label];
}

// One drag at a time, in one list: the skills, a section's entries, or an
// entry's printed bullets. Keys: "skills", "experience", "bullets:experience:mbition".
function readList(list: string): string[] {
  const [kind, section, entryId] = list.split(":") as [string, Section, string];

  if (kind === "skills") {
    return draft.value.skills;
  }

  if (kind === "bullets") {
    return pickOf(section, entryId)?.bullets ?? [];
  }

  return draft.value[kind as Section].map((pick) => pick.id);
}

function writeList(list: string, ids: string[]) {
  const [kind, section, entryId] = list.split(":") as [string, Section, string];

  if (kind === "skills") {
    draft.value.skills = ids;
  } else if (kind === "bullets") {
    const pick = pickOf(section, entryId);

    if (pick) {
      pick.bullets = ids;
    }
  } else {
    const picks = draft.value[kind as Section];

    draft.value[kind as Section] = ids.flatMap((id) => picks.find((pick) => pick.id === id) ?? []);
  }
}

const dragging = ref({ list: "", id: "", over: "" });

function dragStart(list: string, id: string, event: DragEvent) {
  dragging.value = { list, id, over: id };
  event.dataTransfer?.setData("text/plain", id);

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function dragOver(list: string, id: string) {
  const state = dragging.value;

  if (state.list === list && state.id && id !== state.over) {
    state.over = id;
    writeList(list, moveIdTo(readList(list), state.id, id));
  }
}

function dragEnd() {
  dragging.value = { list: "", id: "", over: "" };
}

function moveKey(list: string, id: string, event: KeyboardEvent) {
  const step = { ArrowUp: -1, ArrowDown: 1 }[event.key] as -1 | 1 | undefined;

  if (step) {
    event.preventDefault();
    writeList(list, moveId(readList(list), id, step));
  }
}

function isDragged(list: string, id: string): boolean {
  return dragging.value.list === list && dragging.value.id === id;
}

const sections = [
  { id: "experience" as const, title: "Professional Experience" },
  { id: "education" as const, title: "Education" },
];
</script>

<template>
  <article class="sheet" aria-label="The CV as printed">
    <header class="sheet__header">
      <p class="sheet__name">{{ profile?.name }}</p>
      <input
        v-model="draft.role"
        class="sheet__input sheet__role"
        required
        aria-label="Role line"
        placeholder="Role line"
      />
      <textarea
        v-model="draft.summary"
        class="sheet__input sheet__summary"
        rows="1"
        aria-label="Summary"
        placeholder="Add a summary line, or leave it empty to print none."
      />
      <p v-if="profile" class="sheet__contact">
        <span>{{ profile.location }}</span>
        <span>{{ profile.email }}</span>
        <span>{{ profile.phone }}</span>
        <span v-for="link in profile.links" :key="link.href">{{ stripScheme(link.href) }}</span>
      </p>
    </header>

    <section class="sheet__section" aria-labelledby="sheet-skills">
      <h2 id="sheet-skills" class="sheet__heading">Technical Skills</h2>

      <ol class="sheet__list">
        <li
          v-for="group in pickedSkills"
          :key="group.label"
          class="line skill"
          :class="{ 'line--dragged': isDragged('skills', group.label) }"
          draggable="true"
          @dragstart="dragStart('skills', group.label, $event)"
          @dragover.prevent="dragOver('skills', group.label)"
          @drop.prevent
          @dragend="dragEnd"
        >
          <button
            type="button"
            class="grip"
            :aria-label="`Move ${group.title}: arrow up or down`"
            @keydown="moveKey('skills', group.label, $event)"
          >
            <Icon name="tabler:grip-vertical" size="14" />
          </button>
          <span class="skill__title">{{ group.title }}</span>
          <span class="skill__items">{{ group.items.join(", ") }}</span>
          <button
            type="button"
            class="drop"
            :aria-label="`Leave out ${group.title}`"
            title="Leave out"
            @click="toggleSkill(group.label)"
          >
            <Icon name="tabler:x" size="14" />
          </button>
        </li>
      </ol>

      <ul v-if="leftOutSkills.length" class="spare" aria-label="Skill groups left out">
        <li v-for="group in leftOutSkills" :key="group.label">
          <button type="button" class="spare__add" @click="toggleSkill(group.label)">
            <Icon name="tabler:plus" size="14" />
            {{ group.title }}
          </button>
        </li>
      </ul>
    </section>

    <section
      v-for="section in sections"
      :key="section.id"
      class="sheet__section"
      :aria-labelledby="`sheet-${section.id}`"
    >
      <h2 :id="`sheet-${section.id}`" class="sheet__heading">{{ section.title }}</h2>

      <div
        v-for="entry in pickedEntries(section.id)"
        :key="entry.id"
        class="entry"
        :class="{ 'line--dragged': isDragged(section.id, entry.id) }"
        draggable="true"
        @dragstart="dragStart(section.id, entry.id, $event)"
        @dragover.prevent="dragOver(section.id, entry.id)"
        @drop.prevent
        @dragend="dragEnd"
      >
        <div class="line entry__head">
          <button
            type="button"
            class="grip"
            :aria-label="`Move ${entry.title}: arrow up or down`"
            @keydown="moveKey(section.id, entry.id, $event)"
          >
            <Icon name="tabler:grip-vertical" size="14" />
          </button>
          <div class="entry__text">
            <p class="entry__row">
              <span class="entry__title">{{ entry.title }}</span>
              <span class="entry__period">{{ period(entry) }}</span>
            </p>
            <p class="entry__org">
              {{ entry.organization
              }}<span v-if="entry.location" class="entry__location">, {{ entry.location }}</span>
            </p>
          </div>
          <button
            type="button"
            class="drop"
            :aria-label="`Leave out ${entry.title}`"
            title="Leave out"
            @click="removeEntry(section.id, entry.id)"
          >
            <Icon name="tabler:x" size="14" />
          </button>
        </div>

        <ul v-if="entry.bullets.length" class="bullets">
          <li
            v-for="bullet in bulletsOf(section.id, entry)"
            :key="bullet.id"
            class="line bullet"
            :class="{
              'bullet--off': !bullet.on,
              'line--dragged': isDragged(`bullets:${section.id}:${entry.id}`, bullet.id),
            }"
            :draggable="bullet.on"
            @dragstart.stop="dragStart(`bullets:${section.id}:${entry.id}`, bullet.id, $event)"
            @dragover.prevent.stop="dragOver(`bullets:${section.id}:${entry.id}`, bullet.id)"
            @drop.prevent.stop
            @dragend.stop="dragEnd"
          >
            <button
              v-if="bullet.on"
              type="button"
              class="grip"
              aria-label="Move bullet: arrow up or down"
              @keydown="moveKey(`bullets:${section.id}:${entry.id}`, bullet.id, $event)"
            >
              <Icon name="tabler:grip-vertical" size="14" />
            </button>
            <span v-else class="grip" aria-hidden="true" />
            <button
              type="button"
              class="bullet__text"
              :aria-pressed="bullet.on"
              :title="bullet.on ? 'Printed: click to leave out' : 'Left out: click to print'"
              @click="toggleBullet(section.id, entry.id, bullet.id)"
            >
              {{ bullet.text }}
            </button>
          </li>
        </ul>
      </div>

      <p v-if="!draft[section.id].length" class="sheet__empty">Nothing from here is printed.</p>

      <ul
        v-if="leftOutEntries(section.id).length"
        class="spare"
        :aria-label="`${section.title} left out`"
      >
        <li v-for="entry in leftOutEntries(section.id)" :key="entry.id">
          <button type="button" class="spare__add" @click="addEntry(section.id, entry)">
            <Icon name="tabler:plus" size="14" />
            {{ entry.title }}
            <span class="spare__org">{{ entry.organization }}</span>
          </button>
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
/* The paper: the PDF's colors and type, at screen size. Edit controls sit in
   the margin (grips left, remove right) and show on hover or focus. */
.sheet {
  --gutter: 2.25rem;

  display: grid;
  gap: var(--space-8);
  padding: var(--space-8) var(--gutter);
  border-radius: var(--radius-sm);
  background-color: var(--color-paper);
  box-shadow: var(--color-paper-shadow);
  color: var(--color-paper-soft);
  font-size: 0.9375rem;
  line-height: 1.55;
}

@media (min-width: 48rem) {
  .sheet {
    --gutter: 3.5rem;

    padding-block: var(--space-12);
  }
}

.sheet__header {
  display: grid;
  gap: var(--space-1);
  padding-bottom: var(--space-5);
  border-bottom: 2px solid var(--color-paper-accent);
}

.sheet__name {
  font-size: 2rem;
  font-weight: var(--font-semibold);
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--color-paper-text);
}

/* Role and summary are text on the paper that happens to be editable. */
.sheet__input {
  inline-size: 100%;
  padding: 0.125rem 0.375rem;
  margin-inline: -0.375rem;
  border: 1px dashed transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: inherit;
  font: inherit;
  resize: none;
  field-sizing: content;
}

.sheet__input:hover {
  border-color: var(--color-paper-rule);
}

.sheet__input:focus {
  border-style: solid;
  border-color: var(--color-paper-accent);
  outline: none;
}

.sheet__input::placeholder {
  color: var(--color-paper-muted);
  font-style: italic;
}

.sheet__role {
  margin-top: var(--space-1);
  font-size: 1.0625rem;
  font-weight: var(--font-medium);
  color: var(--color-paper-accent);
}

.sheet__contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-4);
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-paper-muted);
}

.sheet__section {
  display: grid;
  gap: var(--space-4);
}

.sheet__heading {
  padding-bottom: var(--space-1-5);
  border-bottom: 1px solid var(--color-paper-rule);
  font-size: 0.8125rem;
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  color: var(--color-paper-accent);
}

.sheet__list,
.bullets,
.spare {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}

.sheet__empty {
  font-style: italic;
  color: var(--color-paper-muted);
}

/* A line on the paper with a grip in the left margin and a remove button in
   the right one. */
.line {
  position: relative;
}

.grip,
.drop {
  position: absolute;
  top: 0.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-paper-muted);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.grip {
  left: calc(var(--gutter) * -1 + 0.5rem);
  cursor: grab;
}

.drop {
  right: calc(var(--gutter) * -1 + 0.5rem);
  cursor: pointer;
}

.line:hover > .grip,
.line:hover > .drop,
.grip:focus-visible,
.drop:focus-visible {
  opacity: 1;
}

.grip:hover,
.drop:hover {
  color: var(--color-paper-accent);
}

.line--dragged {
  opacity: 0.4;
}

.skill {
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr);
  gap: var(--space-3);
}

.skill + .skill {
  margin-top: var(--space-1);
}

.skill__title {
  font-weight: var(--font-semibold);
  color: var(--color-paper-text);
}

.entry + .entry {
  margin-top: var(--space-4);
}

.entry__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0 var(--space-4);
}

.entry__title {
  font-size: 1.0625rem;
  font-weight: var(--font-semibold);
  color: var(--color-paper-text);
}

.entry__period {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-paper-muted);
}

.entry__org {
  font-weight: var(--font-medium);
  color: var(--color-paper-accent);
}

.entry__location {
  font-weight: var(--font-regular);
  color: var(--color-paper-muted);
}

.bullets {
  margin-top: var(--space-2);
}

/* A bullet is a toggle: printed bullets look as in the PDF, left-out ones
   are faded and struck through so the sheet still reads as the CV. */
.bullet__text {
  position: relative;
  display: block;
  inline-size: 100%;
  padding: 0.1875rem 0 0.1875rem 1.125rem;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.bullet__text::before {
  position: absolute;
  top: 0.8em;
  left: 0.125rem;
  inline-size: 0.3125rem;
  block-size: 0.3125rem;
  background-color: var(--color-paper-accent);
  content: "";
}

.bullet__text:hover {
  color: var(--color-paper-text);
}

.bullet__text:focus-visible {
  outline: 2px solid var(--color-paper-accent);
  outline-offset: 2px;
}

.bullet--off .bullet__text {
  color: var(--color-paper-muted);
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--color-paper-muted) 60%, transparent);
  opacity: 0.6;
}

.bullet--off .bullet__text::before {
  border: 1px solid var(--color-paper-muted);
  background: none;
}

.bullet--off .bullet__text:hover {
  opacity: 1;
}

/* What this variant leaves out of a section, as quiet buttons to add back. */
.spare {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-paper-rule);
}

.spare__add {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-1) var(--space-2-5);
  border: 1px dashed var(--color-paper-rule);
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-paper-muted);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.spare__add:hover,
.spare__add:focus-visible {
  border-style: solid;
  border-color: var(--color-paper-accent);
  color: var(--color-paper-accent);
}

.spare__org {
  color: var(--color-paper-muted);
}

@media (max-width: 40rem) {
  .skill {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}
</style>
