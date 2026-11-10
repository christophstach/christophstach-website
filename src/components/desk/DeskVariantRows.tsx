import { For, Show } from "solid-js";
import { IconGripVertical } from "../icons";
import type { JSX } from "@solidjs/web";
import styles from "./DeskVariantPicks.module.css";
import { useDragReorder } from "../../lib/drag-reorder";

/** A row's text: what it's called, a detail line, the desk note. */
interface RowText {
  name: string;
  meta: string;
  note: string;
}

interface DeskVariantRowsProps<Item> {
  /** Picked items in print order. */
  picked: Item[];
  /** Items this variant leaves out. */
  leftOut: Item[];
  idOf: (item: Item) => string;
  textOf: (item: Item) => RowText;
  /** Unpick (false) or pick (true) an item. */
  onToggle: (id: string, picked: boolean) => void;
  /** The picked ids in a new order. */
  onReorder: (ids: string[]) => void;
  /** Short text at the end of a picked row, e.g. "4/7". */
  aside?: ((item: Item) => string | undefined) | undefined;
  /** Shown under a picked row, e.g. its bullets. */
  below?: ((item: Item) => JSX.Element) | undefined;
}

function Text(props: { text: RowText }) {
  return (
    <span class={styles.row__text}>
      <span class={styles.row__name}>{props.text.name}</span>
      <span class={styles.row__meta}>{props.text.meta}</span>
      <Show when={props.text.note !== ""}>
        <span class={styles.row__note}>{props.text.note}</span>
      </Show>
    </span>
  );
}

/**
 * One section of the variant editor: the picked items first, draggable into
 * print order, then the ones left out, faded. Checking or unchecking moves
 * an item between the two.
 */
export function DeskVariantRows<Item>(props: DeskVariantRowsProps<Item>) {
  const drag = useDragReorder(
    () => props.picked.map((item) => props.idOf(item)),
    (ids) => {
      props.onReorder(ids);
    },
  );

  return (
    <ul class={styles.rows}>
      <For each={props.picked} keyed={(item) => props.idOf(item)}>
        {(item) => (
          <li
            class={[
              styles.row,
              { [styles["row--dragged"] ?? ""]: drag.dragged() === props.idOf(item()) },
            ]}
            draggable="true"
            onDragStart={(event) => {
              drag.start(props.idOf(item()), event);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              drag.over(props.idOf(item()));
            }}
            onDrop={(event) => {
              event.preventDefault();
            }}
            onDragEnd={() => {
              drag.end();
            }}
          >
            <button
              type="button"
              class={styles.grip}
              aria-label={`Move ${props.textOf(item()).name}: arrow up or down`}
              title="Drag, or use the arrow keys"
              onKeyDown={(event) => {
                drag.key(props.idOf(item()), event);
              }}
            >
              <IconGripVertical size={16} />
            </button>
            <label class={styles.row__main}>
              <input
                type="checkbox"
                checked
                onChange={() => {
                  props.onToggle(props.idOf(item()), false);
                }}
              />
              <Text text={props.textOf(item())} />
            </label>
            <Show when={props.aside?.(item())}>
              {(aside) => <span class={styles.row__aside}>{aside()}</span>}
            </Show>
            {props.below?.(item())}
          </li>
        )}
      </For>
      <For each={props.leftOut} keyed={(item) => props.idOf(item)}>
        {(item) => (
          <li class={[styles.row, styles["row--off"]]}>
            <span class={styles.grip} aria-hidden="true" />
            <label class={styles.row__main}>
              <input
                type="checkbox"
                onChange={() => {
                  props.onToggle(props.idOf(item()), true);
                }}
              />
              <Text text={props.textOf(item())} />
            </label>
          </li>
        )}
      </For>
    </ul>
  );
}

export type { RowText };
