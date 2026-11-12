// A collector's secret, from the answer that made or renewed it to the page that
// shows it once. It stays in the browser's memory: never in the URL, never stored.
import { createSignal } from "solid-js";

const [shown, setShown] = createSignal<{ id: string; secret: string } | undefined>();

/** Keeps a fresh secret for its collector's page. */
function showSecret(id: string, secret: string) {
  setShown({ id, secret });
}

/** The fresh secret of this collector, if one was just made. */
function secretOf(id: string): string {
  const current = shown();

  return current?.id === id ? current.secret : "";
}

/** Forgets the secret once it was seen. */
function forgetSecret() {
  setShown(undefined);
}

export { forgetSecret, secretOf, showSecret };
