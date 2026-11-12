import { array, regex, safeParse, string, union } from "zod/mini";
import type { SearchParams, SetSearchParams } from "@solidjs/router";

// A desk table keeps its state (search, tab, filters, sorting, page) in the
// page's query string, so a reload keeps it and back and forward step through
// it. Only what differs from the table's defaults is written, so a table as it
// first opens has no query at all:
//
//   ?q=berlin&tab=all&source=linkedin&source=url&sort=-found&page=2
//
// `sort` is a column id, `-` before it for descending, `none` for the stored
// order. Filters use their own id as the key, a value per ticked option. The
// query is user input: anything a table doesn't know is ignored.

type SortDirection = "asc" | "desc";

interface TableSort {
  column: string;
  direction: SortDirection;
}

interface TableState {
  query: string;
  /** A tab's value, or `ALL_TAB`; empty for a table without tabs. */
  tab: string;
  /** Undefined for the rows' stored order. */
  sort: TableSort | undefined;
  /** 1-based. */
  page: number;
  /** The ticked values of each filter, by filter id; a filter without any is left out. */
  picked: Readonly<Record<string, readonly string[]>>;
}

/** What a table accepts from the query, and what it shows when the query says nothing. */
interface TableSpec {
  /** Put before every key, for a page with more than one table. */
  prefix: string;
  tabs: readonly string[];
  defaultTab: string;
  sortable: readonly string[];
  defaultSort: TableSort | undefined;
  filters: readonly { id: string; values: readonly string[] }[];
}

/** The tab value that shows every row. */
const ALL_TAB = "\u0000all";
/** How the "all" tab and the stored order are written. */
const ALL_KEYWORD = "all";
const STORED_ORDER = "none";

const rawValue = union([string(), array(string())]);
const pageValue = string().check(regex(/^[1-9]\d{0,5}$/u));
const sortValue = string().check(regex(/^-?[\w-]+$/u));

/** A query value as a list: a key given more than once has several. */
function valuesOf(raw: unknown): string[] {
  const parsed = safeParse(rawValue, raw);

  if (!parsed.success) {
    return [];
  }

  return typeof parsed.data === "string" ? [parsed.data] : parsed.data;
}

/** A key's first value, if it has one. */
function firstOf(raw: unknown): string | undefined {
  return valuesOf(raw)[0];
}

function keys(spec: TableSpec) {
  return {
    query: `${spec.prefix}q`,
    tab: `${spec.prefix}tab`,
    sort: `${spec.prefix}sort`,
    page: `${spec.prefix}page`,
    filter: (id: string) => `${spec.prefix}${id}`,
  };
}

function readSort(raw: unknown, spec: TableSpec): TableSort | undefined {
  const parsed = safeParse(sortValue, firstOf(raw));

  if (!parsed.success) {
    return spec.defaultSort;
  }

  if (parsed.data === STORED_ORDER) {
    return undefined;
  }

  const descending = parsed.data.startsWith("-");
  const column = descending ? parsed.data.slice(1) : parsed.data;

  return spec.sortable.includes(column)
    ? { column, direction: descending ? "desc" : "asc" }
    : spec.defaultSort;
}

function readTab(raw: unknown, spec: TableSpec): string {
  const value = firstOf(raw);

  if (value === undefined) {
    return spec.defaultTab;
  }

  if (spec.tabs.includes(value)) {
    return value;
  }

  return value === ALL_KEYWORD && spec.tabs.includes(ALL_TAB) ? ALL_TAB : spec.defaultTab;
}

/** The table's state as the query gives it, defaults for what it leaves out. */
function readTableState(search: SearchParams, spec: TableSpec): TableState {
  const key = keys(spec);
  const page = safeParse(pageValue, firstOf(search[key.page]));
  const picked: Record<string, readonly string[]> = {};

  for (const filter of spec.filters) {
    const values = [...new Set(valuesOf(search[key.filter(filter.id)]))].filter((value) =>
      filter.values.includes(value),
    );

    if (values.length > 0) {
      picked[filter.id] = values;
    }
  }

  return {
    query: firstOf(search[key.query]) ?? "",
    tab: readTab(search[key.tab], spec),
    sort: readSort(search[key.sort], spec),
    page: page.success ? Number(page.data) : 1,
    picked,
  };
}

function sameSort(a: TableSort | undefined, b: TableSort | undefined): boolean {
  return a?.column === b?.column && a?.direction === b?.direction;
}

/**
 * The query entries that write a change to the state: a part set to its
 * default removes its key, so the router drops it from the URL.
 */
function writeTableState(change: Partial<TableState>, spec: TableSpec): SetSearchParams {
  const key = keys(spec);
  const params: SetSearchParams = {};

  if (change.query !== undefined) {
    params[key.query] = change.query.trim() === "" ? undefined : change.query;
  }

  if (change.tab !== undefined) {
    params[key.tab] =
      change.tab === spec.defaultTab
        ? undefined
        : change.tab === ALL_TAB
          ? ALL_KEYWORD
          : change.tab;
  }

  if ("sort" in change) {
    const sort = change.sort;

    params[key.sort] = sameSort(sort, spec.defaultSort)
      ? undefined
      : sort === undefined
        ? STORED_ORDER
        : `${sort.direction === "desc" ? "-" : ""}${sort.column}`;
  }

  if (change.page !== undefined) {
    params[key.page] = change.page <= 1 ? undefined : change.page;
  }

  if (change.picked !== undefined) {
    for (const filter of spec.filters) {
      params[key.filter(filter.id)] = [...(change.picked[filter.id] ?? [])];
    }
  }

  return params;
}

export { ALL_TAB, readTableState, writeTableState };
export type { SortDirection, TableSort, TableSpec, TableState };
