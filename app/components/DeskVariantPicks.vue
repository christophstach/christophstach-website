<script setup lang="ts">
import { computed, ref } from "vue";
import { moveId, moveIdTo } from "~/utils/drag-reorder";
import type { CvVariant } from "~/data/cv-variants";
import type { EntryRecord } from "~/data/cv";
import { formatMonth } from "~/utils/format";
import { useFetch } from "nuxt/app";

type Section = "experience" | "education";

/** The variant being edited: its role, summary and every pick. */
const draft = defineModel<CvVariant>({ required: true });

const { data: content } = await useFetch("/api/desk/cv-content", { key: "desk-cv-content" });
const { data: projects } = await useFetch("/api/desk/projects", { key: "desk-projects" });

/** Core technologies as one comma-separated line; the server drops empty items. */
const coreTechnologies = computed({
  get: () => draft.value.coreTechnologies.join(", "),
  set: (text: string) => {
    draft.value.coreTechnologies = text.split(",").map((item) => item.trimStart());
  },
});

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

const pickedProjects = computed(() =>
  draft.value.projects.flatMap((id) => projects.value?.find((project) => project.id === id) ?? []),
);
const leftOutProjects = computed(() =>
  (projects.value ?? []).filter((project) => !draft.value.projects.includes(project.id)),
);

function toggleProject(id: string) {
  draft.value.projects = draft.value.projects.includes(id)
    ? draft.value.projects.filter((other) => other !== id)
    : [...draft.value.projects, id];
}

// One drag at a time, in one list: the skills, the projects, a section's
// entries, or an entry's printed bullets. Keys: "skills", "projects",
// "experience", "bullets:experience:mbition".
function readList(list: string): string[] {
  const [kind, section, entryId] = list.split(":") as [string, Section, string];

  if (kind === "skills" || kind === "projects") {
    return draft.value[kind];
  }

  if (kind === "bullets") {
    return pickOf(section, entryId)?.bullets ?? [];
  }

  return draft.value[kind as Section].map((pick) => pick.id);
}

function writeList(list: string, ids: string[]) {
  const [kind, section, entryId] = list.split(":") as [string, Section, string];

  if (kind === "skills" || kind === "projects") {
    draft.value[kind] = ids;
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
  { id: "experience" as const, title: "Experience" },
  { id: "education" as const, title: "Education" },
];

function printedBullets(section: Section, entryId: string): number {
  return pickOf(section, entryId)?.bullets.length ?? 0;
}
</script>

<!-- Every section of a variant as a plain list: checked rows print, in the
     order shown; unchecked rows follow, muted. Picked entries list their
     bullets underneath, picked the same way. -->
<template>
  <div class="picks">
    <section class="picks__section" aria-labelledby="picks-basics">
      <header class="picks__head">
        <h2 id="picks-basics" class="picks__title">Heading</h2>
        <p class="picks__count">Printed under your name</p>
      </header>
      <div class="picks__fields">
        <label class="field">
          <span class="field__label">role</span>
          <input v-model="draft.role" class="input" />
          <span class="field__hint">The line under your name. Empty prints none.</span>
        </label>
        <label class="field field--wide">
          <span class="field__label">summary</span>
          <textarea v-model="draft.summary" class="input" rows="2" />
          <span class="field__hint">One line under the role. Empty prints none.</span>
        </label>
        <label class="field field--wide">
          <span class="field__label">core technologies</span>
          <textarea
            v-model="coreTechnologies"
            class="input"
            rows="1"
            placeholder="TypeScript, Vue, Nuxt"
          />
          <span class="field__hint">
            Comma-separated, printed under the summary in this order. Empty prints none.
          </span>
        </label>
      </div>
    </section>

    <section class="picks__section" aria-labelledby="picks-skills">
      <header class="picks__head">
        <h2 id="picks-skills" class="picks__title">Skills</h2>
        <p class="picks__count">{{ pickedSkills.length }} of {{ skillGroups.length }} printed</p>
        <NuxtLink to="/desk/cv/skills" class="text-link picks__edit">Edit skills</NuxtLink>
      </header>

      <ul class="rows">
        <li
          v-for="group in pickedSkills"
          :key="group.label"
          class="row"
          :class="{ 'row--dragged': isDragged('skills', group.label) }"
          draggable="true"
          @dragstart="dragStart('skills', group.label, $event)"
          @dragover.prevent="dragOver('skills', group.label)"
          @drop.prevent
          @dragend="dragEnd"
        >
          <button
            type="button"
            class="grip"
            :aria-label="`Move ${group.name || group.title}: arrow up or down`"
            title="Drag, or use the arrow keys"
            @keydown="moveKey('skills', group.label, $event)"
          >
            <Icon name="tabler:grip-vertical" size="16" />
          </button>
          <label class="row__main">
            <input type="checkbox" checked @change="toggleSkill(group.label)" />
            <span class="row__text">
              <span class="row__name">{{ group.name || group.title }}</span>
              <span class="row__meta">{{ group.items.join(", ") }}</span>
              <span v-if="group.note" class="row__note">{{ group.note }}</span>
            </span>
          </label>
        </li>
        <li v-for="group in leftOutSkills" :key="group.label" class="row row--off">
          <span class="grip" aria-hidden="true" />
          <label class="row__main">
            <input type="checkbox" @change="toggleSkill(group.label)" />
            <span class="row__text">
              <span class="row__name">{{ group.name || group.title }}</span>
              <span class="row__meta">{{ group.items.join(", ") }}</span>
              <span v-if="group.note" class="row__note">{{ group.note }}</span>
            </span>
          </label>
        </li>
      </ul>
    </section>

    <section
      v-for="section in sections"
      :key="section.id"
      class="picks__section"
      :aria-labelledby="`picks-${section.id}`"
    >
      <header class="picks__head">
        <h2 :id="`picks-${section.id}`" class="picks__title">{{ section.title }}</h2>
        <p class="picks__count">
          {{ draft[section.id].length }} of {{ entriesOf(section.id).length }} printed
        </p>
        <NuxtLink :to="`/desk/cv/${section.id}`" class="text-link picks__edit">
          Edit {{ section.id }}
        </NuxtLink>
      </header>

      <ul class="rows">
        <li
          v-for="entry in pickedEntries(section.id)"
          :key="entry.id"
          class="row"
          :class="{ 'row--dragged': isDragged(section.id, entry.id) }"
          draggable="true"
          @dragstart="dragStart(section.id, entry.id, $event)"
          @dragover.prevent="dragOver(section.id, entry.id)"
          @drop.prevent
          @dragend="dragEnd"
        >
          <button
            type="button"
            class="grip"
            :aria-label="`Move ${entry.name || entry.title}: arrow up or down`"
            title="Drag, or use the arrow keys"
            @keydown="moveKey(section.id, entry.id, $event)"
          >
            <Icon name="tabler:grip-vertical" size="16" />
          </button>
          <label class="row__main">
            <input type="checkbox" checked @change="removeEntry(section.id, entry.id)" />
            <span class="row__text">
              <span class="row__name">{{ entry.name || entry.title }}</span>
              <span class="row__meta"
                >{{ entry.title }} at {{ entry.organization }}, {{ period(entry) }}</span
              >
              <span v-if="entry.note" class="row__note">{{ entry.note }}</span>
            </span>
          </label>
          <span v-if="entry.bullets.length" class="row__aside">
            {{ printedBullets(section.id, entry.id) }}/{{ entry.bullets.length }}
          </span>

          <ul v-if="entry.bullets.length" class="subrows">
            <li
              v-for="bullet in bulletsOf(section.id, entry)"
              :key="bullet.id"
              class="subrow"
              :class="{
                'row--off': !bullet.on,
                'row--dragged': isDragged(`bullets:${section.id}:${entry.id}`, bullet.id),
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
                title="Drag, or use the arrow keys"
                @keydown="moveKey(`bullets:${section.id}:${entry.id}`, bullet.id, $event)"
              >
                <Icon name="tabler:grip-vertical" size="14" />
              </button>
              <span v-else class="grip" aria-hidden="true" />
              <label class="row__main">
                <input
                  type="checkbox"
                  :checked="bullet.on"
                  @change="toggleBullet(section.id, entry.id, bullet.id)"
                />
                <span class="subrow__text">{{ bullet.text }}</span>
              </label>
            </li>
          </ul>
        </li>

        <li v-for="entry in leftOutEntries(section.id)" :key="entry.id" class="row row--off">
          <span class="grip" aria-hidden="true" />
          <label class="row__main">
            <input type="checkbox" @change="addEntry(section.id, entry)" />
            <span class="row__text">
              <span class="row__name">{{ entry.name || entry.title }}</span>
              <span class="row__meta"
                >{{ entry.title }} at {{ entry.organization }}, {{ period(entry) }}</span
              >
              <span v-if="entry.note" class="row__note">{{ entry.note }}</span>
            </span>
          </label>
        </li>
      </ul>
    </section>

    <section class="picks__section" aria-labelledby="picks-projects">
      <header class="picks__head">
        <h2 id="picks-projects" class="picks__title">Projects</h2>
        <p class="picks__count">
          Printed after the experience; the website variant's show on /curriculum
        </p>
        <NuxtLink to="/desk/cv/projects" class="text-link picks__edit">Edit projects</NuxtLink>
      </header>

      <ul class="rows">
        <li
          v-for="project in pickedProjects"
          :key="project.id"
          class="row"
          :class="{ 'row--dragged': isDragged('projects', project.id) }"
          draggable="true"
          @dragstart="dragStart('projects', project.id, $event)"
          @dragover.prevent="dragOver('projects', project.id)"
          @drop.prevent
          @dragend="dragEnd"
        >
          <button
            type="button"
            class="grip"
            :aria-label="`Move ${project.name || project.title}: arrow up or down`"
            title="Drag, or use the arrow keys"
            @keydown="moveKey('projects', project.id, $event)"
          >
            <Icon name="tabler:grip-vertical" size="16" />
          </button>
          <label class="row__main">
            <input type="checkbox" checked @change="toggleProject(project.id)" />
            <span class="row__text">
              <span class="row__name">{{ project.name || project.title }}</span>
              <span class="row__meta">{{ project.tech.join(", ") }}</span>
              <span v-if="project.note" class="row__note">{{ project.note }}</span>
            </span>
          </label>
        </li>
        <li v-for="project in leftOutProjects" :key="project.id" class="row row--off">
          <span class="grip" aria-hidden="true" />
          <label class="row__main">
            <input type="checkbox" @change="toggleProject(project.id)" />
            <span class="row__text">
              <span class="row__name">{{ project.name || project.title }}</span>
              <span class="row__meta">{{ project.tech.join(", ") }}</span>
              <span v-if="project.note" class="row__note">{{ project.note }}</span>
            </span>
          </label>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.picks {
  display: grid;
  gap: var(--space-6);
}

/* Each section is one panel: its title on top, then the rows. */
.picks__section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.picks__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border-strong);
}

.picks__title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.picks__count {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.picks__edit {
  margin-inline-start: auto;
  font-size: var(--text-sm);
}

.picks__fields {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
}

@media (min-width: 40rem) {
  .picks__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

.rows,
.subrows {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}

/* A row: grip, checkbox and text, an optional count on the right, and for
   entries their bullets below. Rows are divided by hairlines. */
.rows {
  padding-inline: var(--space-3) var(--space-5);
}

.row {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--space-2);
  padding-block: var(--space-3);
}

.row + .row {
  border-top: 1px solid var(--color-border);
}

.row--off {
  color: var(--color-text-muted);
}

.row--dragged {
  opacity: 0.4;
}

.grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-muted);
  cursor: grab;
}

span.grip {
  cursor: default;
}

.grip:hover,
.grip:focus-visible {
  color: var(--color-accent);
}

/* Grip, checkbox and count sit centered on the row's text. */
.row__main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-inline-size: 0;
  cursor: pointer;
}

.row__main input {
  flex: none;
  accent-color: var(--color-accent);
}

.row__text {
  display: grid;
  gap: 0.125rem;
  min-inline-size: 0;
}

.row__name {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.row--off .row__name {
  font-weight: var(--font-regular);
  color: inherit;
}

.row__meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.row__note {
  font-size: var(--text-xs);
  line-height: var(--leading-relaxed);
  font-style: italic;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}

.row__aside {
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.rows .subrows {
  padding-inline: 0;
}

.subrows {
  grid-column: 2 / -1;
  margin-top: var(--space-2);
}

.subrow {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr);
  align-items: center;
  column-gap: var(--space-2);
  margin-inline-start: -1.5rem;
  padding-block: var(--space-1-5);
}

.subrow__text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.subrow.row--off .subrow__text {
  color: var(--color-text-muted);
}
</style>
