import { IconGripVertical, IconTrash } from "../icons";
import { Show } from "solid-js";
import styles from "./page-cv-skills.module.css";
import type { useDragReorder } from "../../lib/drag-reorder";

/** A skill group as the form edits it. */
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
  isNew: boolean;
}

type TextKey = "label" | "name" | "note" | "title" | "items";

interface DeskSkillGroupProps {
  group: GroupForm;
  drag: ReturnType<typeof useDragReorder>;
  usedBy: string[];
  onChange: (key: TextKey, value: string) => void;
  onRemove: () => void;
}

/** One skill group in the skills editor: a draggable panel with its fields. */
export function DeskSkillGroup(props: DeskSkillGroupProps) {
  const bind = (key: TextKey) => ({
    value: props.group[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
      props.onChange(key, event.currentTarget.value);
    },
  });
  const heading = () =>
    [props.group.name, props.group.title].find((text) => text !== "") ?? "New group";

  return (
    <li
      class={[
        styles.group,
        "panel",
        { [styles["group--dragged"] ?? ""]: props.drag.dragged() === props.group.label },
      ]}
      draggable={props.group.isNew ? "false" : "true"}
      onDragStart={(event) => {
        props.drag.start(props.group.label, event);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        props.drag.over(props.group.label);
      }}
      onDrop={(event) => {
        event.preventDefault();
      }}
      onDragEnd={() => {
        props.drag.end();
      }}
    >
      <div class={styles.group__head}>
        <button
          type="button"
          class={styles.group__handle}
          aria-label={`Move ${heading() === "New group" ? "group" : heading()}: arrow up or down`}
          title="Drag, or use the arrow keys"
          onKeyDown={(event) => {
            if (!props.group.isNew) {
              props.drag.key(props.group.label, event);
            }
          }}
        >
          <IconGripVertical size={16} />
        </button>
        <span class={styles.group__name}>{heading()}</span>
        <span class={styles.group__used}>
          {props.usedBy.length > 0 ? `in ${props.usedBy.join(", ")}` : "in no variant"}
        </span>
        <button
          type="button"
          class="icon-button"
          aria-label="Remove group"
          title="Remove group"
          onClick={() => {
            props.onRemove();
          }}
        >
          <IconTrash size={16} />
        </button>
      </div>

      <div class={styles.group__fields}>
        <label class="field">
          <span class="field__label">name</span>
          <input {...bind("name")} class="input" required />
          <span class="field__hint">Only the desk shows the name and the note.</span>
        </label>
        <label class="field">
          <span class="field__label">note</span>
          <textarea
            {...bind("note")}
            class="input"
            rows="1"
            placeholder="What this group is for."
          />
        </label>
        <label class="field">
          <span class="field__label">id</span>
          <Show
            when={props.group.isNew}
            fallback={<span class={styles.group__id}>{props.group.label}</span>}
          >
            <input
              {...bind("label")}
              class="input"
              required
              pattern="[a-z0-9][a-z0-9_\-]*"
              placeholder="cloud"
            />
          </Show>
        </label>
        <label class="field">
          <span class="field__label">title</span>
          <input {...bind("title")} class="input" required />
          <span class="field__hint">The heading the CV prints.</span>
        </label>
        <label class="field field--wide">
          <span class="field__label">skills</span>
          <textarea {...bind("items")} class="input" rows="2" />
          <span class="field__hint">Comma-separated, in display order.</span>
        </label>
      </div>
    </li>
  );
}

export type { GroupForm, TextKey };
