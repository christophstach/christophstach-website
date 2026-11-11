import { For, Show, createMemo, createSignal, createUniqueId, untrack } from "solid-js";
import { IconChevronDown, IconChevronUp, IconGripVertical } from "../icons";
import type { JSX } from "@solidjs/web";
import styles from "./DeskTable.module.css";
import { useDragReorder } from "../../lib/drag-reorder";

/** A column: how a row shows in it, and whether it sorts and is searched. */
interface DeskTableColumn<T> {
  id: string;
  /** Lowercase, like a panel title, e.g. "date". */
  header: string;
  cell: (row: T) => JSX.Element;
  /** Sorts by this value; an empty string sorts last in both directions. */
  sort?: ((row: T) => string | number) | undefined;
  /** The direction of the first click, e.g. "desc" for dates. */
  firstDirection?: SortDirection | undefined;
  /** Text the search looks in. */
  search?: ((row: T) => string) | undefined;
  /** "end" for numbers. */
  align?: "start" | "end" | undefined;
  /** The column that names the row: it holds the row's link and has no label on phones. */
  primary?: boolean | undefined;
}

/** One choice out of a few values, e.g. a letter's language. */
interface DeskTableFilter<T> {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  value: (row: T) => string;
}

type SortDirection = "asc" | "desc";

interface DeskTableSort {
  column: string;
  direction: SortDirection;
}

interface DeskTableProps<T> {
  /** The panel title, lowercase, e.g. "applications". */
  title: string;
  rows: readonly T[];
  columns: readonly DeskTableColumn<T>[];
  filters?: readonly DeskTableFilter<T>[] | undefined;
  /** A stable id for each row. */
  rowKey: (row: T) => string;
  /** Makes each whole row a link. */
  rowHref?: ((row: T) => string) | undefined;
  initialSort?: DeskTableSort | undefined;
  /** What a row is, for the count and the search field, e.g. ["letter", "letters"]. */
  noun: readonly [one: string, other: string];
  /** Rows can be moved by hand when the table shows their stored order. */
  reorder?: DeskTableReorder<T> | undefined;
  /** A checkbox on each row, e.g. whether a variant prints it; unchecked rows fade. */
  select?: DeskTableSelect<T> | undefined;
  /** Shown under a row across the whole table, e.g. an entry's bullets. */
  detail?: DeskTableDetail<T> | undefined;
  /** A short line beside the title, e.g. "3 of 5 printed". */
  note?: string | undefined;
  /** At the end of the head, before the search, e.g. a link to edit the rows. */
  actions?: JSX.Element | undefined;
}

/** Moving rows by hand: drag a row's handle, or press the arrow keys on it. */
interface DeskTableReorder<T> {
  /** Gets the ids of the movable rows in their new order. */
  onReorder: (ids: string[]) => void;
  /** Names the row on its handle, e.g. "Move Backend". */
  label: (row: T) => string;
  /** Only these rows move, e.g. the picked ones; the rest have no handle. All by default. */
  movable?: ((row: T) => boolean) | undefined;
}

/** A row of its own under some rows, e.g. an entry's bullets. */
interface DeskTableDetail<T> {
  when: (row: T) => boolean;
  content: (row: T) => JSX.Element;
}

/** Checking rows on and off. */
interface DeskTableSelect<T> {
  checked: (row: T) => boolean;
  onToggle: (id: string, checked: boolean) => void;
  /** Names the row on its checkbox, e.g. "Print Backend". */
  label: (row: T) => string;
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Lowercase without accents, so "zurich" finds "Zürich". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en");
}

function compare(a: string | number, b: string | number, direction: SortDirection): number {
  // Empty values say nothing about order, so they stay at the end either way.
  if (a === "" || b === "") {
    return a === b ? 0 : a === "" ? 1 : -1;
  }

  const order =
    typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b));

  return direction === "asc" ? order : -order;
}

/** One value of a filter, a segment of its strip, with how many rows it leaves. */
function FilterOption(props: {
  name: string;
  label: string;
  count: number;
  checked: boolean;
  onPick: () => void;
}) {
  return (
    <label
      class={[styles.table__option, { [styles["table__option--none"] ?? ""]: props.count === 0 }]}
    >
      <input
        type="radio"
        name={props.name}
        checked={props.checked}
        onChange={() => props.onPick()}
      />
      <span>{props.label}</span>
      <span class={styles.table__count}>{props.count}</span>
    </label>
  );
}

/**
 * A list of records in a desk panel that can be searched, filtered and sorted. Rows keep
 * their order until a column sorts them; filters show how many rows each value leaves.
 */
function DeskTable<T>(props: DeskTableProps<T>): JSX.Element {
  const id = createUniqueId();
  const [query, setQuery] = createSignal("");
  const [picked, setPicked] = createSignal<Readonly<Record<string, string>>>({});
  const [sort, setSort] = createSignal(untrack(() => props.initialSort));

  const terms = createMemo(() =>
    fold(query())
      .split(/\s+/u)
      .filter((term) => term !== ""),
  );
  const searchable = createMemo(() => props.columns.filter((column) => column.search));
  const sortable = createMemo(() => props.columns.filter((column) => column.sort));
  const filters = () => props.filters ?? [];

  const matchesSearch = (row: T) => {
    const words = terms();

    if (words.length === 0) {
      return true;
    }

    const text = fold(
      searchable()
        .map((column) => column.search?.(row) ?? "")
        .join(" "),
    );

    return words.every((word) => text.includes(word));
  };

  /** Whether a row passes every chosen filter, leaving out the one named. */
  const matchesFilters = (row: T, except?: string) =>
    filters().every((filter) => {
      const value = picked()[filter.id];

      return filter.id === except || value === undefined || filter.value(row) === value;
    });

  const shown = createMemo(() => {
    const rows = props.rows.filter((row) => matchesSearch(row) && matchesFilters(row));
    const current = sort();
    const column = props.columns.find((candidate) => candidate.id === current?.column);

    if (current === undefined || column?.sort === undefined) {
      return rows;
    }

    const key = column.sort;

    return rows.toSorted((a, b) => compare(key(a), key(b), current.direction));
  });

  /** For each filter, how many rows each of its values would leave. */
  const counts = createMemo(() => {
    const searched = props.rows.filter(matchesSearch);

    return new Map(
      filters().map((filter) => {
        const rows = searched.filter((row) => matchesFilters(row, filter.id));
        const byValue = new Map<string, number>();

        for (const row of rows) {
          const value = filter.value(row);

          byValue.set(value, (byValue.get(value) ?? 0) + 1);
        }

        return [filter.id, { all: rows.length, byValue }] as const;
      }),
    );
  });

  const narrowed = () => query().trim() !== "" || Object.keys(picked()).length > 0;
  const noun = (count: number) => (count === 1 ? props.noun[0] : props.noun[1]);

  function choose(filterId: string, value: string | undefined) {
    setPicked((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== filterId));

      return value === undefined ? rest : { ...rest, [filterId]: value };
    });
  }

  function sortBy(column: DeskTableColumn<T>) {
    setSort((current) =>
      current?.column === column.id
        ? { column: column.id, direction: current.direction === "asc" ? "desc" : "asc" }
        : { column: column.id, direction: column.firstDirection ?? "asc" },
    );
  }

  function clear() {
    setQuery("");
    setPicked({});
  }

  const movable = (row: T) => props.reorder?.movable?.(row) ?? true;
  // Rows move only in their stored order with every movable row shown: in a sorted
  // view a drop would fight the sort, and with rows hidden it is unclear where it lands.
  const reorderable = () =>
    props.reorder !== undefined &&
    sort() === undefined &&
    shown().filter(movable).length === props.rows.filter(movable).length;
  const drag = useDragReorder(
    () => shown().flatMap((row) => (movable(row) ? [props.rowKey(row)] : [])),
    (ids) => {
      if (reorderable()) {
        props.reorder?.onReorder(ids);
      }
    },
  );

  const checkId = (row: T) => `${id}-check-${props.rowKey(row)}`;

  const columnCount = () =>
    props.columns.length +
    (props.reorder === undefined ? 0 : 1) +
    (props.select === undefined ? 0 : 1);

  function showStoredOrder() {
    setSort(undefined);
    clear();
  }

  /** The arrow a header shows: its direction when sorted, else the first click's. */
  const arrow = (column: DeskTableColumn<T>): SortDirection => {
    const current = sort();

    return current?.column === column.id ? current.direction : (column.firstDirection ?? "asc");
  };

  const ariaSort = (column: DeskTableColumn<T>) => {
    const current = sort();

    if (column.sort === undefined) {
      return undefined;
    }

    if (current?.column !== column.id) {
      return "none";
    }

    return current.direction === "asc" ? "ascending" : "descending";
  };

  return (
    <section class={["panel", styles.table]} aria-labelledby={`${id}-title`}>
      <header class="panel__head">
        <h2 id={`${id}-title`} class="panel__title">
          {props.title}
        </h2>
        <Show when={props.note}>{(note) => <p class="panel__note">{note()}</p>}</Show>

        <Show when={props.actions}>
          <div class={["panel__end", styles.table__actions]}>{props.actions}</div>
        </Show>

        <Show when={searchable().length > 0}>
          <div class={[styles.table__search, { panel__end: props.actions === undefined }]}>
            <input
              type="search"
              class="input"
              value={query()}
              placeholder={`Search ${props.noun[1]}`}
              aria-label={`Search ${props.noun[1]}`}
              aria-controls={`${id}-grid`}
              onInput={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query() !== "") {
                  event.preventDefault();
                  setQuery("");
                }

                // The search is live; in a form, Enter would submit it.
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            />
          </div>
        </Show>
      </header>

      <Show when={filters().length > 0 || sortable().length > 0}>
        <div class={styles.table__controls}>
          <For each={filters()} keyed={(filter) => filter.id}>
            {(filter) => (
              <fieldset class={styles.table__filter}>
                <legend class={styles.table__legend}>{filter().label}</legend>
                <div class={styles.table__options}>
                  <FilterOption
                    name={`${id}-${filter().id}`}
                    label="all"
                    count={counts().get(filter().id)?.all ?? 0}
                    checked={picked()[filter().id] === undefined}
                    onPick={() => choose(filter().id, undefined)}
                  />
                  <For each={filter().options} keyed={(option) => option.value}>
                    {(option) => (
                      <FilterOption
                        name={`${id}-${filter().id}`}
                        label={option().label}
                        count={counts().get(filter().id)?.byValue.get(option().value) ?? 0}
                        checked={picked()[filter().id] === option().value}
                        onPick={() => choose(filter().id, option().value)}
                      />
                    )}
                  </For>
                </div>
              </fieldset>
            )}
          </For>

          {/* Phones have no header row to click, so sorting moves into a select. */}
          <Show when={sortable().length > 0}>
            <label class={["field", styles["table__sort-select"]]}>
              <span class="field__label">sort by</span>
              <select
                class="input"
                onChange={(event) => {
                  const [column = "", direction] = event.currentTarget.value.split(":");

                  setSort(
                    direction === "asc" || direction === "desc" ? { column, direction } : undefined,
                  );
                }}
              >
                <option value="" selected={sort() === undefined}>
                  stored order
                </option>
                <For each={sortable()} keyed={(column) => column.id}>
                  {(column) => (
                    <For each={["asc", "desc"] as const}>
                      {(direction) => (
                        <option
                          value={`${column().id}:${direction}`}
                          selected={
                            sort()?.column === column().id && sort()?.direction === direction
                          }
                        >
                          {column().header}, {direction === "asc" ? "ascending" : "descending"}
                        </option>
                      )}
                    </For>
                  )}
                </For>
              </select>
            </label>
          </Show>
        </div>
      </Show>

      <Show when={props.reorder !== undefined && !reorderable() && shown().length > 0}>
        <p class={styles.table__note}>
          {"Rows move only in their stored order, with none hidden. "}
          <button type="button" class="text-link" onClick={showStoredOrder}>
            Show stored order
          </button>
        </p>
      </Show>

      <div class={styles.table__scroll}>
        <table id={`${id}-grid`} class={styles.table__grid}>
          <thead>
            <tr>
              <Show when={props.reorder !== undefined}>
                <th scope="col" class={styles.table__head} aria-label="move" />
              </Show>
              <Show when={props.select !== undefined}>
                <th scope="col" class={styles.table__head} aria-label="checked" />
              </Show>
              <For each={props.columns} keyed={(column) => column.id}>
                {(column) => (
                  <th
                    scope="col"
                    aria-sort={ariaSort(column())}
                    aria-label={column().header}
                    class={[
                      styles.table__head,
                      {
                        [styles["table__head--end"] ?? ""]: column().align === "end",
                        [styles["table__head--sorted"] ?? ""]: sort()?.column === column().id,
                      },
                    ]}
                  >
                    <Show when={column().sort} fallback={column().header}>
                      <button
                        type="button"
                        class={styles.table__sort}
                        onClick={() => sortBy(column())}
                      >
                        {column().header}
                        <span class={styles["table__sort-icon"]}>
                          {/* A condition in `when`, not in a Show callback: the callback
                              runs once, so it would keep the first direction. */}
                          <Show
                            when={arrow(column()) === "asc"}
                            fallback={<IconChevronDown size={14} />}
                          >
                            <IconChevronUp size={14} />
                          </Show>
                        </span>
                      </button>
                    </Show>
                  </th>
                )}
              </For>
            </tr>
          </thead>

          <tbody>
            <For each={shown()} keyed={(row) => props.rowKey(row)}>
              {(row) => (
                <>
                  <tr
                    class={[
                      styles.table__row,
                      {
                        [styles["table__row--link"] ?? ""]: props.rowHref !== undefined,
                        [styles["table__row--dragged"] ?? ""]:
                          drag.dragged() === props.rowKey(row()),
                        [styles["table__row--off"] ?? ""]:
                          props.select !== undefined && !props.select.checked(row()),
                      },
                    ]}
                    draggable={reorderable() && movable(row()) ? "true" : undefined}
                    onDragStart={(event) => {
                      if (reorderable() && movable(row())) {
                        drag.start(props.rowKey(row()), event);
                      }
                    }}
                    onDragOver={(event) => {
                      if (drag.dragged() !== "") {
                        event.preventDefault();
                        drag.over(props.rowKey(row()));
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                    }}
                    onDragEnd={() => {
                      drag.end();
                    }}
                  >
                    <Show when={props.reorder}>
                      {(reorder) => (
                        <td class={[styles.table__cell, styles["table__cell--grip"]]}>
                          <Show when={movable(row())}>
                            <button
                              type="button"
                              class={styles.table__grip}
                              disabled={!reorderable()}
                              aria-label={`Move ${reorder().label(row())}: arrow up or down`}
                              title={
                                reorderable()
                                  ? "Drag, or use the arrow keys"
                                  : "Show stored order to move"
                              }
                              onKeyDown={(event) => {
                                if (reorderable()) {
                                  drag.key(props.rowKey(row()), event);
                                }
                              }}
                            >
                              <IconGripVertical size={16} />
                            </button>
                          </Show>
                        </td>
                      )}
                    </Show>
                    <Show when={props.select}>
                      {(select) => (
                        <td class={[styles.table__cell, styles["table__cell--check"]]}>
                          <input
                            type="checkbox"
                            id={checkId(row())}
                            class={styles.table__check}
                            checked={select().checked(row())}
                            aria-label={select().label(row())}
                            onChange={(event) => {
                              select().onToggle(props.rowKey(row()), event.currentTarget.checked);
                            }}
                          />
                        </td>
                      )}
                    </Show>
                    <For each={props.columns} keyed={(column) => column.id}>
                      {(column) => (
                        <td
                          data-label={column().primary === true ? undefined : column().header}
                          class={[
                            styles.table__cell,
                            {
                              [styles["table__cell--primary"] ?? ""]: column().primary === true,
                              [styles["table__cell--end"] ?? ""]: column().align === "end",
                            },
                          ]}
                        >
                          <Show
                            when={column().primary === true ? props.rowHref?.(row()) : undefined}
                            fallback={
                              <Show
                                when={column().primary === true && props.select !== undefined}
                                fallback={column().cell(row())}
                              >
                                {/* Without a link, the row's name checks it, as a label does. */}
                                <label for={checkId(row())} class={styles.table__label}>
                                  {column().cell(row())}
                                </label>
                              </Show>
                            }
                          >
                            {(href) => (
                              <a
                                href={href()}
                                class={styles.table__link}
                                // A drag anywhere on the row moves the row, not the link.
                                draggable={props.reorder === undefined ? undefined : "false"}
                              >
                                {column().cell(row())}
                              </a>
                            )}
                          </Show>
                        </td>
                      )}
                    </For>
                  </tr>
                  <Show when={props.detail?.when(row()) === true ? props.detail : undefined}>
                    {(detail) => (
                      <tr class={styles.table__detail}>
                        <td colspan={columnCount()} class={styles["table__detail-cell"]}>
                          {detail().content(row())}
                        </td>
                      </tr>
                    )}
                  </Show>
                </>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={shown().length === 0}>
        <p class="panel__empty">
          <Show when={props.rows.length > 0} fallback={`No ${props.noun[1]} yet.`}>
            {`No ${props.noun[1]} match. `}
            <button type="button" class="text-link" onClick={clear}>
              Clear search and filters
            </button>
          </Show>
        </p>
      </Show>

      <footer class={styles.table__foot}>
        <p role="status">
          {narrowed()
            ? `${shown().length} of ${props.rows.length} ${noun(props.rows.length)}`
            : `${props.rows.length} ${noun(props.rows.length)}`}
        </p>
        <Show when={narrowed() && shown().length > 0}>
          <button type="button" class="text-link" onClick={clear}>
            Clear search and filters
          </button>
        </Show>
      </footer>
    </section>
  );
}

export { DeskTable };
export type {
  DeskTableColumn,
  DeskTableDetail,
  DeskTableFilter,
  DeskTableReorder,
  DeskTableSelect,
  DeskTableSort,
};
