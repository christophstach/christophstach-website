import { createSignal, untrack } from "solid-js";
import { revalidate } from "@solidjs/router";

interface Checkable {
  id: string;
  /** Empty when the variant or letter has no page check on this build. */
  pageFills: number[];
}

/** Checks one variant's or letter's pages; the result is stored with it. */
type CheckPages = (id: string) => Promise<unknown>;

/**
 * Background page checks for one kind of document, refreshing the query with
 * `queryKey` when they are done. The state is module-level: shared by every
 * desk page for the whole visit.
 */
function createPageChecks(queryKey: string) {
  const [running, setRunning] = createSignal<string[]>([]);
  const tried = new Set<string>();

  /**
   * Runs the page check for documents that have none on this build, e.g. all of
   * them after a deploy or one written straight to the database, so the lists
   * show each one's page status. Checks run one after the other: each renders a
   * PDF with Chrome. A document is tried once per visit, so a failing check
   * doesn't loop.
   */
  async function checkMissing(items: Checkable[], checkPages: CheckPages) {
    const missing = items
      .filter((item) => item.pageFills.length === 0 && !tried.has(item.id))
      .map((item) => item.id);

    // Read untracked on purpose: this runs from an effect and must not re-run on its own writes.
    if (missing.length === 0 || untrack(running).length > 0) {
      return;
    }

    for (const id of missing) {
      tried.add(id);
    }

    setRunning(missing);

    async function checkOne(id: string) {
      try {
        await checkPages(id);
      } catch {
        // The editor shows the cause when the document is opened.
      } finally {
        setRunning((ids) => ids.filter((other) => other !== id));
      }
    }

    // One at a time on purpose: the server runs one Chrome per instance.
    await missing.reduce<Promise<void>>(
      (previous, id) => previous.then(() => checkOne(id)),
      Promise.resolve(),
    );
    revalidate(queryKey);
  }

  /** The documents may need a check again. */
  function forget() {
    tried.clear();
  }

  return { checkMissing, forget, running };
}

const variantChecks = createPageChecks("desk-cv-variants");
const letterChecks = createPageChecks("desk-cover-letters");

/** CV content changed: every variant may need a check again. */
const forgetPageChecks = variantChecks.forget;

export { forgetPageChecks, letterChecks, variantChecks };
