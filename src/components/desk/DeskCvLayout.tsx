import { DEFAULT_CV_LAYOUT, sameLayout } from "../../data/cv-print-layout";
import { For, Show } from "solid-js";
import type { CvLayout } from "../../data/cv-print-layout";
import styles from "./DeskCvLayout.module.css";

type Key = keyof CvLayout;

/** One layout control: its steps from the tightest to the most open, with what the PDF gets. */
interface Control<Field extends Key> {
  key: Field;
  label: string;
  hint: string;
  steps: readonly (readonly [step: CvLayout[Field], text: string])[];
}

const SPACING: Control<"spacing"> = {
  key: "spacing",
  label: "spacing",
  hint: "gaps, line height",
  steps: [
    ["compact", "compact"],
    ["normal", "normal"],
    ["airy", "airy"],
    ["spacious", "spacious"],
  ],
};

const TEXT_SIZE: Control<"textSize"> = {
  key: "textSize",
  label: "text size",
  hint: "pt",
  steps: [
    ["small", "9.5"],
    ["normal", "10"],
    ["large", "10.5"],
    ["larger", "11"],
  ],
};

const MARGIN: Control<"margin"> = {
  key: "margin",
  label: "page margin",
  hint: "mm",
  steps: [
    ["narrow", "18"],
    ["normal", "24"],
    ["wide", "30"],
  ],
};

interface StepsProps<Field extends Key> {
  control: Control<Field>;
  layout: CvLayout;
  saved: CvLayout;
  onPick: (key: Field, step: CvLayout[Field]) => void;
}

function Steps<Field extends Key>(props: StepsProps<Field>) {
  return (
    <fieldset class={styles["cv-layout__control"]}>
      <legend class={styles["cv-layout__legend"]}>
        <span class="field__label">{props.control.label}</span>
        <span class={styles["cv-layout__unit"]}>{props.control.hint}</span>
      </legend>
      <div
        class={styles["cv-layout__steps"]}
        style={{ "--cv-layout-steps": String(props.control.steps.length) }}
      >
        <For each={props.control.steps}>
          {([step, text]) => (
            <label
              class={[
                styles["cv-layout__step"],
                {
                  [styles["cv-layout__step--on"] ?? ""]: props.layout[props.control.key] === step,
                  [styles["cv-layout__step--saved"] ?? ""]: props.saved[props.control.key] === step,
                },
              ]}
            >
              <input
                type="radio"
                class={styles["cv-layout__radio"]}
                name={`cv-layout-${props.control.key}`}
                value={String(step)}
                checked={props.layout[props.control.key] === step}
                onChange={() => {
                  props.onPick(props.control.key, step);
                }}
              />
              {text}
            </label>
          )}
        </For>
      </div>
    </fieldset>
  );
}

interface DeskCvLayoutProps {
  /** The layout steps of the CV being edited. */
  layout: CvLayout;
  onChange: (layout: CvLayout) => void;
  /** The stored steps, which the page check shows until steps are tried. */
  saved: CvLayout;
  /** The steps the page check above last printed. */
  checked: CvLayout;
  /** Print the PDF with the current steps, without saving them. */
  onCheck: () => void;
}

/**
 * The CV's layout steps, under the page check: try steps there before
 * saving them, so finding the two full pages takes no saves.
 */
export function DeskCvLayout(props: DeskCvLayoutProps) {
  const isChecked = () => sameLayout(props.layout, props.checked);
  const isSaved = () => sameLayout(props.layout, props.saved);

  const status = () => {
    if (!isChecked()) {
      return "Prints the PDF with this layout, without saving.";
    }

    return isSaved() ? "The pages above use this layout." : "Checked above, not saved yet.";
  };

  function pick<Field extends Key>(key: Field, step: CvLayout[Field]) {
    props.onChange({ ...props.layout, [key]: step });
  }

  return (
    <section class={styles["cv-layout"]} aria-labelledby="cv-layout-title">
      <div class={styles["cv-layout__head"]}>
        <h2 id="cv-layout-title" class={styles["cv-layout__title"]}>
          Layout
        </h2>
        <Show when={!sameLayout(props.layout, DEFAULT_CV_LAYOUT)}>
          <button
            type="button"
            class={styles["cv-layout__reset"]}
            onClick={() => {
              props.onChange({ ...DEFAULT_CV_LAYOUT });
            }}
          >
            reset to normal
          </button>
        </Show>
      </div>

      <div class={styles["cv-layout__controls"]}>
        <Steps control={SPACING} layout={props.layout} saved={props.saved} onPick={pick} />
        <Steps control={TEXT_SIZE} layout={props.layout} saved={props.saved} onPick={pick} />
        <Steps control={MARGIN} layout={props.layout} saved={props.saved} onPick={pick} />
      </div>

      <div class={styles["cv-layout__foot"]}>
        <Show when={!isChecked()}>
          <button
            type="button"
            class={["button button--outline", styles["cv-layout__check"]]}
            onClick={() => {
              props.onCheck();
            }}
          >
            Check pages
          </button>
        </Show>
        <p class="field__hint" role="status">
          {status()}
        </p>
      </div>
    </section>
  );
}
