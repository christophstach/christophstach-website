// Helpers for lists of picked ids, as CVs keep them.

/** Adds or removes an id at the end of a list. */
function toggled(ids: string[], id: string, on: boolean): string[] {
  return on ? [...ids, id] : ids.filter((other) => other !== id);
}

/** Picked items in the CV's order, from all items by id. */
function inOrder<Item>(ids: string[], items: Item[], idOf: (item: Item) => string): Item[] {
  return ids.flatMap((id) => items.find((item) => idOf(item) === id) ?? []);
}

/**
 * Makes a store's list hold `next`, changing it in place: the store keeps
 * the list (and the rows that stay) instead of swapping in a new array.
 */
function setItems<Item>(list: Item[], next: Item[]) {
  list.splice(0, list.length, ...next);
}

export { inOrder, setItems, toggled };
