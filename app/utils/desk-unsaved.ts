import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";
import { onBeforeUnmount, onMounted } from "vue";

/**
 * Asks before leaving a desk editor with unsaved changes: on navigation inside
 * the app (also to the same page with another id) and on closing the tab.
 * Call `leave()` before navigating away on purpose, e.g. after a delete.
 */
function useUnsavedGuard(dirty: () => boolean) {
  let leaving = false;

  function confirmLeave() {
    // oxlint-disable-next-line no-alert -- a desk-only safety net for unsaved work
    return !dirty() || leaving || confirm("Leave without saving your changes?");
  }

  onBeforeRouteLeave(confirmLeave);
  onBeforeRouteUpdate(confirmLeave);

  function warnOnUnload(event: BeforeUnloadEvent) {
    if (dirty() && !leaving) {
      event.preventDefault();
    }
  }

  onMounted(() => window.addEventListener("beforeunload", warnOnUnload));
  onBeforeUnmount(() => window.removeEventListener("beforeunload", warnOnUnload));

  return {
    leave() {
      leaving = true;
    },
  };
}

export { useUnsavedGuard };
