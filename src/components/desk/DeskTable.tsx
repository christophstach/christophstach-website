import { ALL_TAB, readTableState, writeTableState } from "../../lib/desk/table-url";
import { For, Show, createMemo, createSignal, createUniqueId, onFlush, onSettled } from "solid-js";
import type { SortDirection, TableSort, TableSpec, TableState } from "../../lib/desk/table-url";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconGripVertical,
  IconX,
} from "../icons";
import type { JSX } from "@solidjs/web";
import styles from "./DeskTable.module.css";
import { useDragReorder } from "../../lib/drag-reorder";
import { useSearchParams } from "@solidjs/router";

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
  /**
   * A small control at the row's start, e.g. a star: its header is for screen
   * readers only, and on phones it sits in the row's top corner. It doesn't sort.
   */
  control?: boolean | undefined;
}

/**
 * Narrows the rows to some values, e.g. a letter's language. Several values of
 * one filter can be picked; a row passes if one of its values is picked.
 */
interface DeskTableFilter<T> {
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  /** The row's value, or several (a YC company is also venture-backed). */
  value: (row: T) => string | readonly string[];
  /** Rarely needed: it waits behind "More filters" until it's used. */
  more?: boolean | undefined;
}

/** The main split of the rows, as tabs above the filters, e.g. a posting's status. */
interface DeskTableTabs<T> {
  /** Names the tabs for screen readers, e.g. "status". */
  label: string;
  options: readonly { value: string; label: string }[];
  value: (row: T) => string;
  /** The tab shown first; the first option if unset. */
  initial?: string | undefined;
  /** Adds a last tab with every row, named so, e.g. "All". */
  all?: string | undefined;
}

type DeskTableSort = TableSort;

interface DeskTableProps<T> {
  /** The panel title, lowercase, e.g. "applications". */
  title: string;
  rows: readonly T[];
  columns: readonly DeskTableColumn<T>[];
  filters?: readonly DeskTableFilter<T>[] | undefined;
  tabs?: DeskTableTabs<T> | undefined;
  /** A stable id for each row. */
  rowKey: (row: T) => string;
  /** Makes each whole row a link. */
  rowHref?: ((row: T) => string) | undefined;
  initialSort?: DeskTableSort | undefined;
  /** What a row is, for the count and the search field, e.g. ["letter", "letters"]. */
  noun: readonly [one: string, other: string];
  /** Rows can be moved by hand when the table shows their stored order. */
  reorder?: DeskTableReorder<T> | undefined;
  /**
   * Rows per page (default 25). A table that reorders shows every row: a row
   * can't be dragged onto another page.
   */
  pageSize?: number | undefined;
  /** Rows can be ticked and acted on together, e.g. dismissing a few postings. */
  select?: DeskTableSelect<T> | undefined;
  /**
   * Put before the table's keys in the query string, for a page with more
   * than one table. Filter ids are keys too, so none may be `q`, `tab`,
   * `sort` or `page`, nor a key the page itself reads (`new`, `name`).
   */
  urlPrefix?: string | undefined;
}

/** Typing waits this long before the search reaches the URL. */
const SEARCH_WRITE_DELAY = 250;

/** Ticking rows, and what can be done to the ticked ones. */
interface DeskTableSelect<T> {
  /** Names a row on its checkbox, e.g. "Select Backend". */
  label: (row: T) => string;
  actions: readonly DeskTableAction[];
}

interface DeskTableAction {
  label: string;
  /** Gets the ticked rows' ids; answers whether it worked, which clears the ticks. */
  run: (ids: string[]) => Promise<boolean>;
}

const PAGE_SIZE = 25;

/** Moving rows by hand: drag a row's handle, or press the arrow keys on it. */
interface DeskTableReorder<T> {
  /** Gets every row id in the new order; the page stores it and passes the rows back. */
  onReorder: (ids: string[]) => void;
  /** Names the row on its handle, e.g. "Move Backend". */
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

/** A filter's values as a list. */
function valuesOf<T>(filter: DeskTableFilter<T>, row: T): readonly string[] {
  const value = filter.value(row);

  return typeof value === "string" ? [value] : value;
}

/**
 * A filter as a button in the bar: it opens a list of its values to tick, each
 * with how many rows it would leave. The button says how many are ticked.
 */
function FilterButton(props: {
  label: string;
  options: readonly { value: string; label: string }[];
  counts: ReadonlyMap<string, number>;
  picked: readonly string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const id = createUniqueId();
  const [position, setPosition] = createSignal({
    top: "0px",
    left: "0px",
    "max-block-size": "none",
  });
  let button: HTMLButtonElement | undefined;
  let list: HTMLDivElement | undefined;

  // The list sits in the top layer and closes on outside clicks and Escape by
  // itself; it only needs placing by its button, inside the window: below it,
  // or above when it fits there better.
  function place(event: ToggleEvent) {
    const rect = button?.getBoundingClientRect();

    if (event.newState === "open" && rect !== undefined) {
      const width = list?.offsetWidth ?? 0;
      // Its own height, up to the 24rem the stylesheet allows.
      const height = Math.min(list?.scrollHeight ?? 0, 24 * 16);
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const down = height <= below || below >= above;
      const room = down ? below : above;

      setPosition({
        top: `${down ? rect.bottom + 6 : rect.top - 6 - Math.min(height, room)}px`,
        left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`,
        "max-block-size": `min(24rem, ${Math.max(room, 120)}px)`,
      });
    }
  }

  return (
    <>
      <button
        ref={(element) => {
          button = element;
        }}
        type="button"
        class={[
          styles["table__filter-button"],
          { [styles["table__filter-button--on"] ?? ""]: props.picked.length > 0 },
        ]}
        popovertarget={id}
        aria-haspopup="true"
      >
        {props.label}
        <Show when={props.picked.length > 0}>
          <span class={styles["table__filter-count"]}>{props.picked.length}</span>
        </Show>
        <IconChevronDown size={14} />
      </button>

      <div
        id={id}
        ref={(element) => {
          list = element;
        }}
        popover
        class={styles.table__popover}
        style={position()}
        onToggle={place}
      >
        <fieldset class={styles.table__choices}>
          <legend class={styles["table__choices-legend"]}>{props.label}</legend>
          <For each={props.options} keyed={(option) => option.value}>
            {(option) => (
              <label
                class={[
                  styles.table__choice,
                  {
                    [styles["table__choice--none"] ?? ""]:
                      (props.counts.get(option().value) ?? 0) === 0,
                  },
                ]}
              >
                <input
                  type="checkbox"
                  checked={props.picked.includes(option().value)}
                  onChange={() => props.onToggle(option().value)}
                />
                <span>{option().label}</span>
                <span class={styles.table__count}>{props.counts.get(option().value) ?? 0}</span>
              </label>
            )}
          </For>
        </fieldset>
        <Show when={props.picked.length > 0}>
          <button
            type="button"
            class={["text-link", styles["table__choices-clear"]]}
            onClick={() => props.onClear()}
          >
            Clear {props.label}
          </button>
        </Show>
      </div>
    </>
  );
}

/**
 * A list of records in a desk panel that can be searched, filtered and sorted. Rows keep
 * their order until a column sorts them; filters show how many rows each value leaves.
 */
function DeskTable<T>(props: DeskTableProps<T>): JSX.Element {
  const id = createUniqueId();
  const [search, setSearch] = useSearchParams();

  // The state lives in the query string (src/lib/desk/table-url.ts): what the
  // table accepts there, and what it shows when the query leaves a part out.
  const spec = createMemo((): TableSpec => ({
    prefix: props.urlPrefix ?? "",
    tabs:
      props.tabs === undefined
        ? []
        : [
            ...props.tabs.options.map((option) => option.value),
            ...(props.tabs.all === undefined ? [] : [ALL_TAB]),
          ],
    defaultTab:
      props.tabs === undefined
        ? ALL_TAB
        : (props.tabs.initial ?? props.tabs.options[0]?.value ?? ALL_TAB),
    sortable: props.columns.filter((column) => column.sort).map((column) => column.id),
    defaultSort: props.initialSort,
    filters: (props.filters ?? []).map((filter) => ({
      id: filter.id,
      values: filter.options.map((option) => option.value),
    })),
  }));
  const state = createMemo(() => readTableState(search, spec()));
  // What the table shows: the URL's state, or a change ahead of it until its
  // navigation lands (see `update`).
  const [showing, setShowing] = createSignal<TableState>(() => state());
  // The ticked values of each filter, by filter id; a filter without any is off.
  const picked = () => showing().picked;
  const sort = () => showing().sort;
  const tab = () => showing().tab;

  // The search shows what is typed at once; the URL follows after a pause, so
  // a word isn't a navigation per letter. When the URL brings back the text
  // this table wrote, the field keeps what was typed since; any other text
  // (back, forward) replaces it.
  let sentQuery: string | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  const [query, setQuery] = createSignal<string>((previous) => {
    const fromUrl = state().query;

    if (previous !== undefined && fromUrl === sentQuery) {
      return previous;
    }

    sentQuery = undefined;

    return fromUrl;
  });
  const [showMore, setShowMore] = createSignal(false);

  onSettled(() => () => clearTimeout(searchTimer));

  /**
   * Writes a change to the URL, with a search typed but not yet written.
   * Typing replaces the current history entry; everything else is a step of
   * its own, so back undoes a filter, a tab, a sort or a page.
   */
  function update(change: Partial<TableState>, options: { replace?: boolean } = {}) {
    clearTimeout(searchTimer);
    searchTimer = undefined;

    const next: TableState = { ...showing(), query: query(), ...change };

    sentQuery = next.query.trim() === "" ? "" : next.query;
    // Writes beside a navigation wait for it to land; these land at once, so
    // the controls show the change (and keep the select and checkboxes the
    // user just changed) while the URL catches up.
    onFlush(() => {
      setShowing(next);
      setQuery(next.query);
    });
    setSearch(writeTableState(next, spec()), { replace: options.replace === true });
  }

  function typeSearch(value: string) {
    setQuery(value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(
      () => update({ query: value, page: 1 }, { replace: true }),
      SEARCH_WRITE_DELAY,
    );
  }

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

  /** Whether a row passes every filter that has values ticked, leaving out the one named. */
  const matchesFilters = (row: T, except?: string) =>
    filters().every((filter) => {
      const values = picked()[filter.id] ?? [];

      return (
        filter.id === except ||
        values.length === 0 ||
        valuesOf(filter, row).some((value) => values.includes(value))
      );
    });

  const matchesTab = (row: T) =>
    props.tabs === undefined || tab() === ALL_TAB || props.tabs.value(row) === tab();

  /** The rows of the current tab: what the filters narrow, and the count's total. */
  const tabRows = createMemo(() => props.rows.filter(matchesTab));

  /** How many rows each tab holds under the current search and filters. */
  const tabCounts = createMemo(() => {
    const byValue = new Map<string, number>();
    const tabs = props.tabs;

    if (tabs === undefined) {
      return byValue;
    }

    for (const row of props.rows) {
      if (matchesSearch(row) && matchesFilters(row)) {
        const value = tabs.value(row);

        byValue.set(value, (byValue.get(value) ?? 0) + 1);
        byValue.set(ALL_TAB, (byValue.get(ALL_TAB) ?? 0) + 1);
      }
    }

    return byValue;
  });

  const shown = createMemo(() => {
    const rows = tabRows().filter((row) => matchesSearch(row) && matchesFilters(row));
    const current = sort();
    const column = props.columns.find((candidate) => candidate.id === current?.column);

    if (current === undefined || column?.sort === undefined) {
      return rows;
    }

    const key = column.sort;

    return rows.toSorted((a, b) => compare(key(a), key(b), current.direction));
  });

  /** For each filter, how many rows of the tab each of its values would leave. */
  const counts = createMemo(() => {
    const searched = tabRows().filter(matchesSearch);

    return new Map(
      filters().map((filter) => {
        const byValue = new Map<string, number>();

        for (const row of searched) {
          if (matchesFilters(row, filter.id)) {
            for (const value of new Set(valuesOf(filter, row))) {
              byValue.set(value, (byValue.get(value) ?? 0) + 1);
            }
          }
        }

        return [filter.id, byValue] as const;
      }),
    );
  });

  /** The values that occur in any row: a filter lists only those, so its list stays put. */
  const present = createMemo(
    () =>
      new Map(
        filters().map((filter) => [
          filter.id,
          new Set(props.rows.flatMap((row) => valuesOf(filter, row))),
        ]),
      ),
  );

  /** A filter's options worth listing: the ones some row has, and any ticked. */
  const optionsOf = (filter: DeskTableFilter<T>) =>
    filter.options.filter(
      (option) =>
        present().get(filter.id)?.has(option.value) === true ||
        (picked()[filter.id] ?? []).includes(option.value),
    );

  // A filter that can't tell the rows apart (one value for all) isn't offered.
  const usable = () => filters().filter((filter) => optionsOf(filter).length > 1);
  const mainFilters = () => usable().filter((filter) => filter.more !== true);
  const moreFilters = () => usable().filter((filter) => filter.more === true);
  const moreInUse = () => moreFilters().some((filter) => (picked()[filter.id] ?? []).length > 0);

  /** Every ticked value, in the filters' order, for the chips under the bar. */
  const chips = createMemo(() =>
    filters().flatMap((filter) =>
      filter.options
        .filter((option) => (picked()[filter.id] ?? []).includes(option.value))
        .map((option) => ({ filter, option })),
    ),
  );

  const filtering = () => Object.values(picked()).some((values) => values.length > 0);
  const narrowed = () => query().trim() !== "" || filtering();
  const noun = (count: number) => (count === 1 ? props.noun[0] : props.noun[1]);

  // Pages: 1-based. Search, filters and sorting go back to the first page; a
  // search typed but not yet in the URL already shows its first page.
  const page = () => (query() === showing().query ? showing().page : 1);
  const pageSize = () =>
    props.reorder === undefined ? Math.max(1, props.pageSize ?? PAGE_SIZE) : Infinity;
  const pageCount = () => Math.max(1, Math.ceil(shown().length / pageSize()));
  // A page past the end (rows were deleted, say) shows the last one.
  const currentPage = () => Math.min(page(), pageCount());
  const pageStart = () => (currentPage() - 1) * pageSize();
  const visible = createMemo(() =>
    pageCount() === 1 ? shown() : shown().slice(pageStart(), pageStart() + pageSize()),
  );
  let section: HTMLElement | undefined;

  function goTo(next: number) {
    update({ page: Math.min(Math.max(1, next), pageCount()) });

    // Back to the table's top if it scrolled out of view, where the new page starts.
    if (section !== undefined && section.getBoundingClientRect().top < 0) {
      section.scrollIntoView({ block: "start" });
    }
  }

  // Ticked rows, by id. Search, filters and tabs clear them (back and forward
  // too): a ticked row they hide would still be acted on, out of sight.
  const narrowing = createMemo(() => JSON.stringify([query().trim(), tab(), picked()]));
  const [ticked, setTicked] = createSignal<ReadonlySet<string>>(() => {
    narrowing();

    return new Set<string>();
  });
  const [acting, setActing] = createSignal(false);
  const selectable = () => props.select !== undefined;
  // Rows that are gone (deleted, say) drop out.
  const tickedIds = createMemo(() =>
    props.rows.map((row) => props.rowKey(row)).filter((key) => ticked().has(key)),
  );
  const pageKeys = () => visible().map((row) => props.rowKey(row));
  const pageTicked = () => pageKeys().length > 0 && pageKeys().every((key) => ticked().has(key));

  function tick(key: string) {
    setTicked((current) => {
      const next = new Set(current);

      if (!next.delete(key)) {
        next.add(key);
      }

      return next;
    });
  }

  function tickPage() {
    const keys = pageKeys();
    const all = pageTicked();

    setTicked((current) => {
      const next = new Set(current);

      for (const key of keys) {
        if (all) {
          next.delete(key);
        } else {
          next.add(key);
        }
      }

      return next;
    });
  }

  function tickAllShown() {
    setTicked(new Set(shown().map((row) => props.rowKey(row))));
  }

  async function act(action: DeskTableAction) {
    setActing(true);

    try {
      if (await action.run(tickedIds())) {
        setTicked(new Set<string>());
      }
    } finally {
      setActing(false);
    }
  }

  /** Ticks a filter's value, or unticks it. */
  function toggle(filterId: string, value: string) {
    const current = picked();
    const values = current[filterId] ?? [];

    update({
      picked: {
        ...current,
        [filterId]: values.includes(value)
          ? values.filter((other) => other !== value)
          : [...values, value],
      },
      page: 1,
    });
  }

  function clearFilter(filterId: string) {
    update({ picked: { ...picked(), [filterId]: [] }, page: 1 });
  }

  function showTab(value: string) {
    update({ tab: value, page: 1 });
  }

  function sortBy(column: DeskTableColumn<T>) {
    const current = sort();

    update({
      sort:
        current?.column === column.id
          ? { column: column.id, direction: current.direction === "asc" ? "desc" : "asc" }
          : { column: column.id, direction: column.firstDirection ?? "asc" },
      page: 1,
    });
  }

  /** Clears the search and every filter. */
  function clear(change: Partial<TableState> = {}) {
    update({ query: "", picked: {}, page: 1, ...change });
  }

  // Rows move only in their stored order with all of them shown: in a sorted view
  // a drop would fight the sort, and with rows hidden it is unclear where it lands.
  const reorderable = () =>
    props.reorder !== undefined &&
    sort() === undefined &&
    !narrowed() &&
    (props.tabs === undefined || tab() === ALL_TAB);
  const drag = useDragReorder(
    () => shown().map((row) => props.rowKey(row)),
    (ids) => {
      if (reorderable()) {
        props.reorder?.onReorder(ids);
      }
    },
  );

  function showStoredOrder() {
    clear({ sort: undefined });
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
    <section
      ref={(element) => {
        section = element;
      }}
      class={["panel", styles.table]}
      aria-labelledby={`${id}-title`}
    >
      <header class="panel__head">
        <h2 id={`${id}-title`} class="panel__title">
          {props.title}
        </h2>

        <Show when={searchable().length > 0}>
          <div class={["panel__end", styles.table__search]}>
            <input
              type="search"
              class="input"
              value={query()}
              placeholder={`Search ${props.noun[1]}`}
              aria-label={`Search ${props.noun[1]}`}
              aria-controls={`${id}-grid`}
              onInput={(event) => typeSearch(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query() !== "") {
                  event.preventDefault();
                  update({ query: "", page: 1 }, { replace: true });
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

      <Show when={props.tabs}>
        {(tabs) => (
          <div class={styles.table__tabs} role="group" aria-label={tabs().label}>
            <For
              each={[
                ...tabs().options,
                ...(tabs().all === undefined ? [] : [{ value: ALL_TAB, label: tabs().all ?? "" }]),
              ]}
              keyed={(option) => option.value}
            >
              {(option) => (
                <button
                  type="button"
                  class={styles.table__tab}
                  aria-pressed={tab() === option().value ? "true" : "false"}
                  aria-controls={`${id}-grid`}
                  onClick={() => showTab(option().value)}
                >
                  {option().label}
                  <span class={styles.table__count}>{tabCounts().get(option().value) ?? 0}</span>
                </button>
              )}
            </For>
          </div>
        )}
      </Show>

      <Show when={usable().length > 0 || sortable().length > 0}>
        <div
          class={[
            styles.table__controls,
            { [styles["table__controls--sort-only"] ?? ""]: usable().length === 0 },
          ]}
        >
          <Show when={usable().length > 0}>
            <div class={styles.table__bar}>
              <For each={mainFilters()} keyed={(filter) => filter.id}>
                {(filter) => (
                  <FilterButton
                    label={filter().label}
                    options={optionsOf(filter())}
                    counts={counts().get(filter().id) ?? new Map<string, number>()}
                    picked={picked()[filter().id] ?? []}
                    onToggle={(value) => toggle(filter().id, value)}
                    onClear={() => clearFilter(filter().id)}
                  />
                )}
              </For>
              <Show when={showMore() || moreInUse()}>
                <For each={moreFilters()} keyed={(filter) => filter.id}>
                  {(filter) => (
                    <FilterButton
                      label={filter().label}
                      options={optionsOf(filter())}
                      counts={counts().get(filter().id) ?? new Map<string, number>()}
                      picked={picked()[filter().id] ?? []}
                      onToggle={(value) => toggle(filter().id, value)}
                      onClear={() => clearFilter(filter().id)}
                    />
                  )}
                </For>
              </Show>
              <Show when={moreFilters().length > 0 && !moreInUse()}>
                <button
                  type="button"
                  class={["text-link", styles["table__more"]]}
                  aria-expanded={showMore() ? "true" : "false"}
                  onClick={() => setShowMore((open) => !open)}
                >
                  {showMore() ? "Fewer filters" : "More filters"}
                </button>
              </Show>
            </div>
          </Show>

          <Show when={chips().length > 0}>
            <ul class={styles.table__chips} aria-label="Active filters">
              <For each={chips()} keyed={(chip) => `${chip.filter.id}:${chip.option.value}`}>
                {(chip) => (
                  <li>
                    <button
                      type="button"
                      class={styles.table__chip}
                      aria-label={`Remove ${chip().filter.label}: ${chip().option.label}`}
                      onClick={() => toggle(chip().filter.id, chip().option.value)}
                    >
                      <span class={styles["table__chip-filter"]}>{chip().filter.label}</span>
                      {chip().option.label}
                      <IconX size={14} />
                    </button>
                  </li>
                )}
              </For>
              <li>
                <button type="button" class="text-link" onClick={() => clear()}>
                  Clear all
                </button>
              </li>
            </ul>
          </Show>

          {/* Phones have no header row to click, so sorting moves into a select. */}
          <Show when={sortable().length > 0}>
            <label class={["field", styles["table__sort-select"]]}>
              <span class="field__label">sort by</span>
              <select
                class="input"
                onChange={(event) => {
                  const [column = "", direction] = event.currentTarget.value.split(":");

                  update({
                    sort:
                      direction === "asc" || direction === "desc"
                        ? { column, direction }
                        : undefined,
                    page: 1,
                  });
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

      <Show when={props.select !== undefined && tickedIds().length > 0 ? props.select : undefined}>
        {(select) => (
          <div class={styles.table__bulk} role="group" aria-label={`Ticked ${props.noun[1]}`}>
            <p class={styles["table__bulk-count"]} aria-live="polite">
              {`${tickedIds().length} ${noun(tickedIds().length)} ticked`}
            </p>
            <Show when={tickedIds().length < shown().length}>
              <button type="button" class="text-link" onClick={tickAllShown}>
                {`Tick all ${shown().length}`}
              </button>
            </Show>
            <button type="button" class="text-link" onClick={() => setTicked(new Set<string>())}>
              Untick all
            </button>
            <div class={styles["table__bulk-actions"]}>
              <For each={select().actions} keyed={(action) => action.label}>
                {(action) => (
                  <button
                    type="button"
                    class="button button--outline"
                    disabled={acting()}
                    onClick={() => void act(action())}
                  >
                    {action().label}
                  </button>
                )}
              </For>
            </div>
          </div>
        )}
      </Show>

      <div class={styles.table__scroll}>
        <table id={`${id}-grid`} class={styles.table__grid}>
          <thead>
            <tr>
              <Show when={selectable()}>
                <th scope="col" class={[styles.table__head, styles["table__head--check"]]}>
                  <input
                    type="checkbox"
                    checked={pageTicked()}
                    disabled={visible().length === 0}
                    aria-label={`Tick the ${props.noun[1]} on this page`}
                    onChange={tickPage}
                  />
                </th>
              </Show>
              <Show when={props.reorder !== undefined}>
                <th scope="col" class={styles.table__head} aria-label="move" />
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
                        [styles["table__head--control"] ?? ""]: column().control === true,
                      },
                    ]}
                  >
                    {/* A control's header is only its aria-label. */}
                    <Show
                      when={column().control === true ? undefined : column().sort}
                      fallback={column().control === true ? null : column().header}
                    >
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
            <For each={visible()} keyed={(row) => props.rowKey(row)}>
              {(row) => (
                <tr
                  class={[
                    styles.table__row,
                    {
                      [styles["table__row--link"] ?? ""]: props.rowHref !== undefined,
                      [styles["table__row--dragged"] ?? ""]: drag.dragged() === props.rowKey(row()),
                    },
                  ]}
                  draggable={reorderable() ? "true" : undefined}
                  onDragStart={(event) => {
                    if (reorderable()) {
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
                  <Show when={props.select}>
                    {(select) => (
                      <td class={[styles.table__cell, styles["table__cell--check"]]}>
                        <input
                          type="checkbox"
                          checked={ticked().has(props.rowKey(row()))}
                          aria-label={select().label(row())}
                          onChange={() => tick(props.rowKey(row()))}
                        />
                      </td>
                    )}
                  </Show>
                  <Show when={props.reorder}>
                    {(reorder) => (
                      <td class={[styles.table__cell, styles["table__cell--grip"]]}>
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
                      </td>
                    )}
                  </Show>
                  <For each={props.columns} keyed={(column) => column.id}>
                    {(column) => (
                      <td
                        data-label={
                          column().primary === true || column().control === true
                            ? undefined
                            : column().header
                        }
                        class={[
                          styles.table__cell,
                          {
                            [styles["table__cell--control"] ?? ""]: column().control === true,
                            [styles["table__cell--primary"] ?? ""]: column().primary === true,
                            [styles["table__cell--end"] ?? ""]: column().align === "end",
                          },
                        ]}
                      >
                        <Show
                          when={column().primary === true ? props.rowHref?.(row()) : undefined}
                          fallback={column().cell(row())}
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
              )}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={shown().length === 0}>
        <p class="panel__empty">
          <Show when={props.rows.length > 0} fallback={`No ${props.noun[1]} yet.`}>
            <Show when={narrowed()} fallback={`No ${props.noun[1]} here.`}>
              {`No ${props.noun[1]} match. `}
              <button type="button" class="text-link" onClick={() => clear()}>
                Clear search and filters
              </button>
            </Show>
          </Show>
        </p>
      </Show>

      <footer class={styles.table__foot}>
        <p role="status">
          <Show when={pageCount() > 1}>
            {`${pageStart() + 1}–${pageStart() + visible().length} · `}
          </Show>
          {narrowed()
            ? `${shown().length} of ${tabRows().length} ${noun(tabRows().length)}`
            : `${tabRows().length} ${noun(tabRows().length)}`}
        </p>
        <Show when={narrowed() && shown().length > 0}>
          <button type="button" class="text-link" onClick={() => clear()}>
            Clear search and filters
          </button>
        </Show>
        <Show when={pageCount() > 1}>
          <nav class={styles.table__pages} aria-label={`Pages of ${props.title}`}>
            <button
              type="button"
              class={styles.table__page}
              disabled={currentPage() === 1}
              aria-label="Previous page"
              onClick={() => goTo(currentPage() - 1)}
            >
              <IconChevronLeft size={16} />
            </button>
            <span aria-live="polite">
              page {currentPage()} of {pageCount()}
            </span>
            <button
              type="button"
              class={styles.table__page}
              disabled={currentPage() === pageCount()}
              aria-label="Next page"
              onClick={() => goTo(currentPage() + 1)}
            >
              <IconChevronRight size={16} />
            </button>
          </nav>
        </Show>
      </footer>
    </section>
  );
}

export { DeskTable };
export type { DeskTableColumn, DeskTableFilter, DeskTableReorder, DeskTableSort, DeskTableTabs };
