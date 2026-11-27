// The server middleware chain, in front of page renders, server functions
// and API routes. createAPIHandler serves the GET/POST/... exports of route
// modules and passes everything else down the chain.
import { Effect } from "effect";
import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler } from "filesystem-routing/api";
import { paths } from "./router";
import { readSessionEffect } from "./server/session";
import routes from "virtual:file-routes";

/**
 * Keeps signed-out requests out of /desk and signed-in ones off /login, before
 * anything renders. Desk server functions and endpoints check the session
 * themselves (requireUser): this only guards the pages.
 */
/** Where a request for this path has to go instead, given the session; undefined lets it through. */
function guardedPathEffect(request: Request, path: string): Effect.Effect<string | undefined> {
  return Effect.gen(function* () {
    const desk = paths.desk();
    const login = paths.login();
    const isDesk = path === desk || path === `${desk}/` || path.startsWith(`${desk}/`);

    if (!isDesk && path !== login) {
      return undefined;
    }

    const signedIn = (yield* readSessionEffect(request)) !== undefined;

    if (isDesk) {
      return signedIn ? undefined : login;
    }

    return signedIn ? desk : undefined;
  });
}

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Frame-Options", "DENY"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  [
    "Content-Security-Policy",
    "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  ],
];

const HSTS_HEADER = "max-age=31536000; includeSubDomains";

/** Attaches baseline HTTP security headers without mutating immutable responses. */
const securityHeaders: StartMiddleware = async (event, next) => {
  const response = await next();
  const headers = new Headers(response.headers);

  for (const [name, value] of SECURITY_HEADERS) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  const url = new URL(event.request.url);

  if (url.protocol === "https:" && !headers.has("Strict-Transport-Security")) {
    headers.set("Strict-Transport-Security", HSTS_HEADER);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const deskGuard: StartMiddleware = async (event, next) => {
  const url = new URL(event.request.url);
  const target = await Effect.runPromise(guardedPathEffect(event.request, url.pathname));

  return target === undefined ? next() : Response.redirect(new URL(target, url), 302);
};

export default [securityHeaders, deskGuard, createAPIHandler(routes)] satisfies StartMiddleware[];
