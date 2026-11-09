import styles from "./DeskSaveBar.module.css";

interface DeskSaveBarProps {
  /** A write is running. */
  busy: boolean;
  /** The last failed write, shown in the bar. */
  error?: string | undefined;
  onDiscard: () => void;
}

/** Sticks to the bottom of the form it sits in; its Save button submits that form. */
export function DeskSaveBar(props: DeskSaveBarProps) {
  return (
    <div class={styles["save-bar"]} role="status">
      <span class={styles["save-bar__dot"]} aria-hidden="true" />
      <span class={styles["save-bar__text"]}>
        {props.error === undefined || props.error === "" ? "Unsaved changes" : props.error}
      </span>
      <button
        type="button"
        class="button button--outline"
        disabled={props.busy}
        onClick={() => {
          props.onDiscard();
        }}
      >
        Discard
      </button>
      <button type="submit" class="button button--primary" disabled={props.busy}>
        {props.busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
