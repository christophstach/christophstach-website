<script setup lang="ts">
import { CV_LAYOUT_STEPS } from "~/data/cv-print-layout";
import type { CvVariant } from "~/data/cv-variants";

type CvLayout = CvVariant["layout"];

/** The layout steps of the variant being edited. */
const layout = defineModel<CvLayout>({ required: true });

type Key = keyof CvLayout;

// Each control lists its steps from the tightest to the most open, as
// CV_LAYOUT_STEPS orders them; the labels say what the PDF gets.
const controls: { key: Key; label: string; steps: Record<string, string> }[] = [
  {
    key: "spacing",
    label: "spacing",
    steps: { compact: "compact", normal: "normal", airy: "airy", spacious: "spacious" },
  },
  {
    key: "textSize",
    label: "text size",
    steps: { small: "12.5", normal: "13", large: "13.5", larger: "14" },
  },
  {
    key: "margin",
    label: "page margin",
    steps: { narrow: "14 mm", normal: "18 mm", wide: "22 mm" },
  },
];

function stepsOf(key: Key) {
  return Object.keys(CV_LAYOUT_STEPS[key]) as CvLayout[Key][];
}

function pick(key: Key, step: string) {
  layout.value = { ...layout.value, [key]: step };
}
</script>

<!-- The variant's layout steps, under the page check: save, and the pages
     above show how full the PDF is with them. -->
<template>
  <section class="cv-layout" aria-labelledby="cv-layout-title">
    <h2 id="cv-layout-title" class="cv-layout__title">Layout</h2>

    <fieldset v-for="control in controls" :key="control.key" class="cv-layout__control">
      <legend class="field__label">{{ control.label }}</legend>
      <div class="cv-layout__steps">
        <label
          v-for="step in stepsOf(control.key)"
          :key="step"
          class="cv-layout__step"
          :class="{ 'cv-layout__step--on': layout[control.key] === step }"
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

    <p class="field__hint">Save to check the pages with these steps.</p>
  </section>
</template>

<style scoped>
.cv-layout {
  display: grid;
  gap: var(--space-4);
}

.cv-layout__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.cv-layout__control {
  display: grid;
  gap: var(--space-1-5);
  min-inline-size: 0;
  padding: 0;
  margin: 0;
  border: 0;
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
</style>
