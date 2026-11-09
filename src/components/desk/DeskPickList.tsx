import { For, Show, createMemo, createSignal } from "solid-js";
import { IconChevronDown, IconChevronUp, IconGripVertical } from "../icons";
import type { JSX } from "@solidjs/web";
import styles from "./DeskPickList.module.css";
import { useDragReorder } from "../../lib/drag-reorder";

/** Something a variant can pick: an entry, a bullet, a project, a skill group. */
interface PickItem {
  id: string;
  title: string;
  /** Second line or trailing text, e.g. the organization. */
  sub?: string | undefined;
  /** Short status on the right, e.g. "6/9 bullets". */
  meta?: string | undefined;
}

interface DeskPickListProps {
  /** Everything that can be picked, in its own order. */
  items: PickItem[];
  /** Picked ids, in print order. */
  picked: string[];
  onPickedChange: (ids: string[]) => void;
  /** What the list holds, for screen readers, e.g. "Experience". */
  label: string;
  /** Picked items can open to show their detail. */
  detail?: ((item: PickItem) => JSX.Element) | undefined;
  /** Smaller rows, for a list inside another one's detail. */
  dense?: boolean | undefined;
}

function ItemText(props: { item: PickItem }) {
  return (
    <span class={styles.picks__text}>
      <span class={styles.picks__title}>{props.item.title}</span>
      <Show when={props.item.sub}>{(sub) => <span class={styles.picks__sub}>{sub()}</span>}</Show>
    </span>
  );
}

interface PickedRowProps {
  item: PickItem;
  drag: ReturnType<typeof useDragReorder>;
  open: boolean;
  onToggle: () => void;
  onUnpick: () => void;
  detail: DeskPickListProps["detail"];
}

/** A picked item: a drag handle, its checkbox, and its detail when open. */
function PickedRow(props: PickedRowProps) {
  return (
    <li
      class={[
        styles.picks__item,
        { [styles["picks__item--dragged"] ?? ""]: props.drag.dragged() === props.item.id },
      ]}
      draggable="true"
      onDragStart={(event) => {
        event.stopPropagation();
        props.drag.start(props.item.id, event);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.drag.over(props.item.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragEnd={(event) => {
        event.stopPropagation();
        props.drag.end();
      }}
    >
      <div class={styles.picks__row}>
        <button
          type="button"
          class={styles.picks__handle}
          aria-label={`Move ${props.item.title}: arrow up or down`}
          title="Drag, or use the arrow keys"
          onKeyDown={(event) => {
            props.drag.key(props.item.id, event);
          }}
        >
          <IconGripVertical size={16} />
        </button>

        <label class={styles.picks__check}>
          <input
            type="checkbox"
            checked
            onChange={() => {
              props.onUnpick();
            }}
          />
          <ItemText item={props.item} />
        </label>

        <Show
          when={props.detail !== undefined}
          fallback={
            <Show when={props.item.meta}>
              {(meta) => <span class={styles.picks__meta}>{meta()}</span>}
            </Show>
          }
        >
          <button
            type="button"
            class={styles.picks__toggle}
            aria-expanded={props.open ? "true" : "false"}
            aria-label={`${props.open ? "Close" : "Open"} ${props.item.title}`}
            onClick={() => {
              props.onToggle();
            }}
          >
            <Show when={props.item.meta}>{(meta) => <span>{meta()}</span>}</Show>
            <Show when={props.open} fallback={<IconChevronDown size={16} />}>
              <IconChevronUp size={16} />
            </Show>
          </button>
        </Show>
      </div>

      <Show when={props.open ? props.detail : undefined}>
        {(detail) => <div class={styles.picks__detail}>{detail()(props.item)}</div>}
      </Show>
    </li>
  );
}

/** Pick items with checkboxes and put the picked ones in order by dragging. */
export function DeskPickList(props: DeskPickListProps) {
  const byId = createMemo(() => new Map(props.items.map((item) => [item.id, item])));
  const pickedItems = createMemo(() => props.picked.flatMap((id) => byId().get(id) ?? []));
  const otherItems = createMemo(() =>
    props.items.filter((item) => !props.picked.includes(item.id)),
  );
  const [open, setOpen] = createSignal<ReadonlySet<string>>(new Set());
  const drag = useDragReorder(
    () => props.picked,
    (ids) => {
      props.onPickedChange(ids);
    },
  );

  function toggleOpen(id: string) {
    setOpen((current) => {
      const next = new Set(current);

      if (!next.delete(id)) {
        next.add(id);
      }

      return next;
    });
  }

  return (
    <div class={[styles.picks, { [styles["picks--dense"] ?? ""]: props.dense === true }]}>
      <Show when={props.dense !== true}>
        <p class={styles.picks__head}>
          <span>picked · {pickedItems().length}</span>
          <span class={styles.picks__hint}>in print order, drag to reorder</span>
        </p>
      </Show>

      <Show
        when={pickedItems().length > 0}
        fallback={
          <Show when={props.dense !== true && props.items.length > 0}>
            <p class={styles.picks__none}>Nothing picked yet.</p>
          </Show>
        }
      >
        <ol class={styles.picks__list} aria-label={`${props.label}, picked`}>
          <For each={pickedItems()}>
            {(item) => (
              <PickedRow
                item={item}
                drag={drag}
                open={open().has(item.id)}
                onToggle={() => {
                  toggleOpen(item.id);
                }}
                onUnpick={() => {
                  props.onPickedChange(props.picked.filter((other) => other !== item.id));
                }}
                detail={props.detail}
              />
            )}
          </For>
        </ol>
      </Show>

      <Show when={otherItems().length > 0}>
        <Show when={props.dense !== true}>
          <p class={[styles.picks__head, styles["picks__head--off"]]}>
            <span>not picked · {otherItems().length}</span>
          </p>
        </Show>

        <ul
          class={[styles.picks__list, styles["picks__list--off"]]}
          aria-label={`${props.label}, not picked`}
        >
          <For each={otherItems()}>
            {(item) => (
              <li class={styles.picks__item}>
                <div class={styles.picks__row}>
                  <span
                    class={[styles.picks__handle, styles["picks__handle--off"]]}
                    aria-hidden="true"
                  />

                  <label class={styles.picks__check}>
                    <input
                      type="checkbox"
                      onChange={() => {
                        props.onPickedChange([...props.picked, item.id]);
                      }}
                    />
                    <ItemText item={item} />
                  </label>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

export type { PickItem };
