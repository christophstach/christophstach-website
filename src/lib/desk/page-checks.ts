import { createSignal } from "solid-js";
import { revalidate } from "@solidjs/router";

interface Checkable {
  id: string;
  /** Empty when the variant has no page check on this build. */
  pageFills: number[];
}

// Shared by every desk page for the whole visit, like Nuxt's useState was.
const [running, setRunning] = createSignal<string[]>([]);
const tried = new Set<string>();

/** Checks one variant's pages; the result is stored with the variant. */
type CheckPages = (id: string) => Promise<unknown>;

/**
 * Runs the page check for variants that have none on this build, e.g. all of
 * them after a deploy, so the overview shows each one's page status. Checks
 * run one after the other: each renders a PDF with Chrome. A variant is tried
 * once per visit, so a failing check doesn't loop.
 */
async function checkMissing(variants: Checkable[], checkPages: CheckPages) {
  const missing = variants
    .filter((variant) => variant.pageFills.length === 0 && !tried.has(variant.id))
    .map((variant) => variant.id);

  if (missing.length === 0 || running().length > 0) {
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
      // The editor shows the cause when the variant is opened.
    } finally {
      setRunning((ids) => ids.filter((other) => other !== id));
    }
  }

  // One at a time on purpose: the server runs one Chrome per instance.
  await missing.reduce<Promise<void>>(
    (previous, id) => previous.then(() => checkOne(id)),
    Promise.resolve(),
  );
  revalidate("desk-cv-variants");
}

/** CV content changed: every variant may need a check again. */
function forgetPageChecks() {
  tried.clear();
}

export { checkMissing, forgetPageChecks, running };
