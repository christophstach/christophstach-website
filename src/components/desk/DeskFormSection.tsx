import type { JSX } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import { Show } from "solid-js";
import styles from "./DeskFormSection.module.css";

interface DeskFormSectionProps extends ParentProps {
  title: string;
  /** A short line beside the title. */
  description?: string | undefined;
  /** One column, for lists; two columns of fields otherwise. */
  single?: boolean | undefined;
  /** Shown at the end of the head row, e.g. an add button. */
  aside?: JSX.Element;
}

/**
 * A titled block of a desk form: a panel with the title and its explanation
 * in a head row, the fields below.
 */
export function DeskFormSection(props: DeskFormSectionProps) {
  return (
    <section class="panel form-section">
      <header class="panel__head">
        <h2 class="panel__title">{props.title}</h2>
        <Show when={props.description}>
          {(description) => <p class="panel__note">{description()}</p>}
        </Show>
        {props.aside}
      </header>
      <div
        class={[
          "panel__body",
          styles["form-section__body"],
          { [styles["form-section__body--single"] ?? ""]: props.single === true },
        ]}
      >
        {props.children}
      </div>
    </section>
  );
}
