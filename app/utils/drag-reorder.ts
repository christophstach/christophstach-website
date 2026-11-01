import { ref } from "vue";

/** Moves `id` one place up (-1) or down (+1) in a list of ids; ends stay put. */
function moveId(ids: string[], id: string, step: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + step;

  if (from === -1 || to < 0 || to >= ids.length) {
    return ids;
  }

  const moved = ids.filter((other) => other !== id);

  moved.splice(to, 0, id);

  return moved;
}

/** Puts `id` where `target` is, shifting the rest, as a drag over `target` does. */
function moveIdTo(ids: string[], id: string, target: string): string[] {
  const to = ids.indexOf(target);

  if (id === target || to === -1 || !ids.includes(id)) {
    return ids;
  }

  const moved = ids.filter((other) => other !== id);

  moved.splice(to, 0, id);

  return moved;
}

/**
 * Drag-and-drop reordering of a list of ids with native HTML drag events: the
 * list reorders live while an item is dragged over another. Arrow keys on an
 * item's handle (keyboard users) move it one place.
 */
function useDragReorder(read: () => string[], write: (ids: string[]) => void) {
  const dragged = ref("");
  // The item last dragged over. Moving an item can leave the pointer over the
  // same neighbour, which must not move it back and forth.
  let lastOver = "";

  return {
    dragged,
    start(id: string, event: DragEvent) {
      dragged.value = id;
      lastOver = id;
      event.dataTransfer?.setData("text/plain", id);

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    },
    over(id: string) {
      if (dragged.value && id !== lastOver) {
        lastOver = id;
        write(moveIdTo(read(), dragged.value, id));
      }
    },
    end() {
      dragged.value = "";
      lastOver = "";
    },
    key(id: string, event: KeyboardEvent) {
      const step = { ArrowUp: -1, ArrowDown: 1 }[event.key] as -1 | 1 | undefined;

      if (step) {
        event.preventDefault();
        write(moveId(read(), id, step));
      }
    },
  };
}

export { moveId, moveIdTo, useDragReorder };
