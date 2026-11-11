// The router's typed `paths` for server pages. A server page can't import
// src/router.ts: the router imports every page (server pages eagerly), so the
// import would be a cycle. src/router.ts registers its paths here instead,
// and this module imports nothing at runtime (the type import is erased).
import type { Router } from "./router";

type Paths = (typeof Router)["paths"];

let registered: Paths | undefined;

/** Called once by src/router.ts when the router is created. */
function registerPaths(paths: Paths) {
  registered = paths;
}

/** The router's paths; the router is created before any page renders. */
function routePaths(): Paths {
  if (registered === undefined) {
    throw new Error("The router hasn't registered its paths yet.");
  }

  return registered;
}

export { registerPaths, routePaths };
