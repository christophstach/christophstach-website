import { For, Show } from "solid-js";
import { inOrder, setItems, toggled } from "../../lib/desk/picks";
import type { EntryRecord } from "../../data/cv";
import { IconGripVertical } from "../icons";
import type { VariantInput } from "../../lib/desk/variants";
import styles from "./DeskVariantPicks.module.css";
import { useDragReorder } from "../../lib/drag-reorder";

interface BulletsProps {
  form: VariantInput;
  setForm: (write: (draft: VariantInput) => void) => void;
  section: "experience" | "education";
  entry: EntryRecord;
}

/** An entry's bullets: the printed ones in print order (draggable), then the rest, faded. */
export function DeskVariantBullets(props: BulletsProps) {
  const chosen = () =>
    props.form[props.section].find((pick) => pick.id === props.entry.id)?.bullets ?? [];
  const writeChosen = (ids: string[]) => {
    props.setForm((draft) => {
      const pick = draft[props.section].find((candidate) => candidate.id === props.entry.id);

      if (pick !== undefined) {
        setItems(pick.bullets, ids);
      }
    });
  };
  const drag = useDragReorder(chosen, writeChosen);
  const rows = () => [
    ...inOrder(chosen(), props.entry.bullets, (bullet) => bullet.id).map((bullet) => ({
      id: bullet.id,
      text: bullet.text,
      on: true,
    })),
    ...props.entry.bullets
      .filter((bullet) => !chosen().includes(bullet.id))
      .map((bullet) => ({ id: bullet.id, text: bullet.text, on: false })),
  ];

  return (
    <ul class={styles.subrows}>
      <For each={rows()} keyed={(bullet) => bullet.id}>
        {(bullet) => (
          <li
            class={[
              styles.subrow,
              {
                [styles["row--off"] ?? ""]: !bullet().on,
                [styles["row--dragged"] ?? ""]: drag.dragged() === bullet().id,
              },
            ]}
            draggable={bullet().on ? "true" : "false"}
            onDragStart={(event) => {
              event.stopPropagation();
              drag.start(bullet().id, event);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              drag.over(bullet().id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onDragEnd={(event) => {
              event.stopPropagation();
              drag.end();
            }}
          >
            <Show when={bullet().on} fallback={<span class={styles.grip} aria-hidden="true" />}>
              <button
                type="button"
                class={styles.grip}
                aria-label="Move bullet: arrow up or down"
                title="Drag, or use the arrow keys"
                onKeyDown={(event) => {
                  drag.key(bullet().id, event);
                }}
              >
                <IconGripVertical size={14} />
              </button>
            </Show>
            <label class={styles.row__main}>
              <input
                type="checkbox"
                checked={bullet().on}
                onChange={() => {
                  writeChosen(toggled(chosen(), bullet().id, !bullet().on));
                }}
              />
              <span class={styles.subrow__text}>{bullet().text}</span>
            </label>
          </li>
        )}
      </For>
    </ul>
  );
}
