import { onSettled } from "solid-js";
import { useBeforeLeave } from "@solidjs/router";

/**
 * Asks before leaving a desk editor with unsaved changes: on navigation inside
 * the app (also to the same page with another id) and on closing the tab.
 * Call `leave()` before navigating away on purpose, e.g. after a delete.
 */
function useUnsavedGuard(dirty: () => boolean) {
  let leaving = false;

  useBeforeLeave((event) => {
    // oxlint-disable-next-line no-alert -- a desk-only safety net for unsaved work
    if (
      !event.defaultPrevented &&
      dirty() &&
      !leaving &&
      !confirm("Leave without saving your changes?")
    ) {
      event.preventDefault();
    }
  });

  function warnOnUnload(event: BeforeUnloadEvent) {
    if (dirty() && !leaving) {
      event.preventDefault();
    }
  }

  onSettled(() => {
    window.addEventListener("beforeunload", warnOnUnload);

    return () => {
      window.removeEventListener("beforeunload", warnOnUnload);
    };
  });

  return {
    leave() {
      leaving = true;
    },
  };
}

export { useUnsavedGuard };
