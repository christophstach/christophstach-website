import { refreshNuxtData, useState } from "nuxt/app";

interface Checkable {
  id: string;
  /** Empty when the variant has no page check on this build. */
  pageFills: number[];
}

/**
 * Runs the page check for variants that have none on this build, e.g. all of
 * them after a deploy, so the overview shows each one's page status. Checks
 * run one after the other: each renders a PDF with Chrome. A variant is tried
 * once per visit, so a failing check doesn't loop.
 */
function usePageChecks() {
  const running = useState<string[]>("desk-page-checks-running", () => []);
  const tried = useState<string[]>("desk-page-checks-tried", () => []);

  async function checkOne(id: string) {
    try {
      await $fetch("/api/desk/cv-pdf", { query: { variant: id } });
    } catch {
      // The editor shows the cause when the variant is opened.
    } finally {
      running.value = running.value.filter((other) => other !== id);
    }
  }

  async function checkMissing(variants: Checkable[]) {
    const missing = variants
      .filter((variant) => variant.pageFills.length === 0 && !tried.value.includes(variant.id))
      .map((variant) => variant.id);

    if (missing.length === 0 || running.value.length > 0) {
      return;
    }

    tried.value = [...tried.value, ...missing];
    running.value = missing;

    await missing.reduce((previous, id) => previous.then(() => checkOne(id)), Promise.resolve());
    await refreshNuxtData("desk-cv-variants");
  }

  return { running, checkMissing };
}

export { usePageChecks };
