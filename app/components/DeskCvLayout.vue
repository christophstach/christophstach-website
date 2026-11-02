<script setup lang="ts">
import { CV_LAYOUT_STEPS, DEFAULT_CV_LAYOUT, sameLayout } from "~/data/cv-print-layout";
import type { CvVariant } from "~/data/cv-variants";
import { computed } from "vue";

type CvLayout = CvVariant["layout"];
type Key = keyof CvLayout;

/** The layout steps of the variant being edited. */
const layout = defineModel<CvLayout>({ required: true });

const { saved, checked } = defineProps<{
  /** The stored steps, which the page check shows until steps are tried. */
  saved: CvLayout;
  /** The steps the page check above last printed. */
  checked: CvLayout;
}>();

const emit = defineEmits<{
  /** Print the PDF with the current steps, without saving them. */
  check: [];
}>();

// Each control lists its steps from the tightest to the most open, as
// CV_LAYOUT_STEPS orders them; the labels say what the PDF gets.
const controls: { key: Key; label: string; hint: string; steps: Record<string, string> }[] = [
  {
    key: "spacing",
    label: "spacing",
    hint: "gaps and line height",
    steps: { compact: "compact", normal: "normal", airy: "airy", spacious: "spacious" },
  },
  {
    key: "textSize",
    label: "text size",
    hint: "body text, px",
    steps: { small: "12.5", normal: "13", large: "13.5", larger: "14" },
  },
  {
    key: "margin",
    label: "page margin",
    hint: "every side, mm",
    steps: { narrow: "14", normal: "18", wide: "22" },
  },
];

function stepsOf(key: Key) {
  return Object.keys(CV_LAYOUT_STEPS[key]) as CvLayout[Key][];
}

function pick(key: Key, step: string) {
  layout.value = { ...layout.value, [key]: step };
}

const isDefault = computed(() => sameLayout(layout.value, DEFAULT_CV_LAYOUT));
const isChecked = computed(() => sameLayout(layout.value, checked));
const isSaved = computed(() => sameLayout(layout.value, saved));
</script>

<!-- The variant's layout steps, under the page check: try steps there before
     saving them, so finding the two full pages takes no saves. -->
<template>
  <section class="cv-layout" aria-labelledby="cv-layout-title">
    <div class="cv-layout__head">
      <h2 id="cv-layout-title" class="cv-layout__title">Layout</h2>
      <button
        v-if="!isDefault"
        type="button"
        class="cv-layout__reset"
        @click="layout = { ...DEFAULT_CV_LAYOUT }"
      >
        reset to normal
      </button>
    </div>

    <fieldset v-for="control in controls" :key="control.key" class="cv-layout__control">
      <legend class="cv-layout__legend">
        <span class="field__label">{{ control.label }}</span>
        <span class="cv-layout__unit">{{ control.hint }}</span>
      </legend>
      <div class="cv-layout__steps">
        <label
          v-for="step in stepsOf(control.key)"
          :key="step"
          class="cv-layout__step"
          :class="{
            'cv-layout__step--on': layout[control.key] === step,
            'cv-layout__step--saved': saved[control.key] === step,
          }"
        >
          <input
            type="radio"
            class="cv-layout__radio"
            :name="`cv-layout-${control.key}`"
            :value="step"
            :checked="layout[control.key] === step"
            @change="pick(control.key, step)"
          />
          {{ control.steps[step] }}
        </label>
      </div>
    </fieldset>

    <div class="cv-layout__foot">
      <button
        type="button"
        class="button button--outline cv-layout__check"
        :disabled="isChecked"
        @click="emit('check')"
      >
        Check pages
      </button>
      <p class="field__hint">
        <template v-if="isChecked && isSaved">The pages above use these steps.</template>
        <template v-else-if="isChecked">Checked above, not saved yet.</template>
        <template v-else>Prints the PDF with these steps, without saving.</template>
      </p>
    </div>
  </section>
</template>

<style scoped>
.cv-layout {
  display: grid;
  gap: var(--space-4);
}

.cv-layout__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}

.cv-layout__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.cv-layout__reset {
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.cv-layout__reset:hover {
  color: var(--color-text);
}

.cv-layout__control {
  display: grid;
  gap: var(--space-1-5);
  min-inline-size: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

/* The label left, what the numbers mean right, on one line above the steps. */
.cv-layout__legend {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  inline-size: 100%;
  padding: 0;
  margin-bottom: var(--space-1-5);
}

.cv-layout__unit {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* A segmented control: the steps side by side in one bordered strip. */
.cv-layout__steps {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  padding: 2px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
}

.cv-layout__step {
  position: relative;
  padding: var(--space-1-5) var(--space-1);
  border-radius: calc(var(--radius-md) - 2px);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
  color: var(--color-text-muted);
  cursor: pointer;
}

.cv-layout__step:hover {
  color: var(--color-text);
}

.cv-layout__step--on {
  background-color: var(--color-accent-subtle-bg);
  color: var(--color-accent-subtle-text);
  font-weight: var(--font-semibold);
}

/* A dot under the stored step while another one is picked, so trying steps
   never loses the way back. */
.cv-layout__step--saved:not(.cv-layout__step--on)::after {
  content: "";
  position: absolute;
  bottom: 3px;
  left: 50%;
  inline-size: 4px;
  block-size: 4px;
  border-radius: 50%;
  background-color: var(--color-text-muted);
  translate: -50% 0;
}

.cv-layout__step:has(:focus-visible) {
  outline: 2px solid var(--color-ring);
  outline-offset: 1px;
}

/* The radio stays for the keyboard and screen readers; the label is the button. */
.cv-layout__radio {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.cv-layout__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.cv-layout__check:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.cv-layout__foot .field__hint {
  flex: 1 1 10rem;
}
</style>
