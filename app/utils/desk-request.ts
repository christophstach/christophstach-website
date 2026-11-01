import { ref } from "vue";

/** The message of a failed desk API call: the cause from its body, if it has one. */
function errorMessage(error: unknown): string {
  const failure = error as { data?: { message?: string }; message?: string };

  return failure.data?.message ?? failure.message ?? String(error);
}

/**
 * Runs desk API writes one at a time: `busy` while one runs, `error` holds the
 * last failure. `run` resolves to whether the write succeeded.
 */
function useDeskRequest() {
  const busy = ref(false);
  const failed = ref("");

  async function run(request: () => Promise<unknown>): Promise<boolean> {
    busy.value = true;
    failed.value = "";

    try {
      await request();

      return true;
    } catch (error) {
      failed.value = errorMessage(error);

      return false;
    } finally {
      busy.value = false;
    }
  }

  return { busy, error: failed, run };
}

export { useDeskRequest };
