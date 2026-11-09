import { createSignal } from "solid-js";

/** The message of a failed desk call: a server function rethrows the server's error. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs desk writes one at a time: `busy` while one runs, `error` holds the
 * last failure. `run` resolves to whether the write succeeded.
 */
function useDeskRequest() {
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  async function run(request: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError("");

    try {
      await request();

      return true;
    } catch (error_) {
      setError(errorMessage(error_));

      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, run };
}

export { errorMessage, useDeskRequest };
