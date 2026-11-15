// A deploy replaces the hashed client chunks, so a tab opened before it fails
// to load a route's code on its next navigation. Each browser words it its own way.
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|Failed to load module script/iu;
const RELOADED_AT = "stale-build-reloaded-at";
// A reload that fails the same way within this time shows the error instead.
const RETRY_AFTER_MS = 10_000;

/**
 * Loads `href` anew when a render failed because this tab runs an older
 * build than the server, so the page comes back on the current one. `href`
 * is the router's target: the address bar still shows the page the
 * navigation started from. True if it loads; false on the server, for
 * other errors, or right after a load of its own.
 */
export function reloadForStaleBuild(error: unknown, href: string): boolean {
  if (typeof window === "undefined" || !(error instanceof Error)) {
    return false;
  }

  if (!CHUNK_ERROR.test(error.message)) {
    return false;
  }

  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT));

    if (Date.now() - last < RETRY_AFTER_MS) {
      return false;
    }

    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    // Without storage there is no guard against a reload loop.
    return false;
  }

  window.location.assign(href);

  return true;
}
