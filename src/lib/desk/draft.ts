import { createMemo, createStore, reconcile } from "solid-js";
import { useUnsavedGuard } from "./unsaved";

/** Equal when two values serialize alike, so a refetch of unchanged data is no change. */
function sameJson(one: unknown, other: unknown): boolean {
  return JSON.stringify(one) === JSON.stringify(other);
}

/**
 * Not a function: what a store can be seeded with. Spelled exactly like
 * solid-js's own (unexported) NoFn, which a generic seed must match.
 */
type NoFn<Value> = Value extends Function ? never : Value;

/**
 * An editor's form state, following what's stored: a writable store that
 * resets when the stored value changes (after a save, say) and only then —
 * the router refetches every query after any server function call, and
 * unchanged data must not throw away what's being typed. Resets reconcile by
 * id, so rows and unchanged fields keep their identity. `dirty` compares the
 * draft with the stored value; leaving with changes asks first.
 */
function useDraft<Form extends object>(stored: () => Form, empty: NoFn<Form>) {
  const saved = createMemo(stored, { equals: sameJson });
  // Returning the value (not writing the draft) makes the store reconcile it by key.
  const [form, setForm] = createStore<Form>(() => saved(), empty);
  // Serializing the store itself (not a snapshot) reads, and so tracks, every field.
  const dirty = () => !sameJson(form, saved());
  const guard = useUnsavedGuard(dirty);

  return {
    form,
    setForm,
    saved,
    dirty,
    /** Puts the stored value back, e.g. on "Discard". */
    reset: () => {
      setForm(reconcile(saved(), "id"));
    },
    /** Leaves without asking, e.g. after a delete. */
    leave: () => {
      guard.leave();
    },
  };
}

export { sameJson, useDraft };
