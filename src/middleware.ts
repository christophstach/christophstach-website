// The server middleware chain, in front of page renders, server functions
// and API routes. createAPIHandler serves the GET/POST/... exports of route
// modules and passes everything else down the chain.
import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler } from "filesystem-routing/api";
import { paths } from "./router";
import { readDeskUser } from "./server/session";
import routes from "virtual:file-routes";

/**
 * Keeps signed-out requests out of /desk and signed-in ones off /login, before
 * anything renders. Desk server functions and endpoints check the session
 * themselves (requireUser): this only guards the pages.
 */
/** Where a request for this path has to go instead, given the session; undefined lets it through. */
async function guardedPath(request: Request, path: string): Promise<string | undefined> {
  const desk = paths.desk();
  const login = paths.login();
  const isDesk = path === desk || path === `${desk}/` || path.startsWith(`${desk}/`);

  if (!isDesk && path !== login) {
    return undefined;
  }

  const signedIn = (await readDeskUser(request)) !== undefined;

  if (isDesk) {
    return signedIn ? undefined : login;
  }

  return signedIn ? desk : undefined;
}

const deskGuard: StartMiddleware = async (event, next) => {
  const url = new URL(event.request.url);
  const target = await guardedPath(event.request, url.pathname);

  return target === undefined ? next() : Response.redirect(new URL(target, url), 302);
};

export default [deskGuard, createAPIHandler(routes)] satisfies StartMiddleware[];
