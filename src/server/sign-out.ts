import "server-only";
import { getRequestEvent } from "@solidjs/web";
import { signOutCookies } from "./session";

// The body of the desk's sign-out server function (src/lib/desk/session.ts),
// which imports this module dynamically. Its own module, imported nowhere
// else, so the dynamic import splits it off; session.ts itself is imported
// statically by the middleware and the auth routes.

/** Clears the session cookie on the current response. */
async function signOut(): Promise<void> {
  const event = getRequestEvent();

  if (event === undefined) {
    return;
  }

  for (const cookie of await signOutCookies(event.request)) {
    event.response.headers.append("Set-Cookie", cookie);
  }
}

export { signOut };
