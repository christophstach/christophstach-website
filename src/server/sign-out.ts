import "server-only";
import { Effect } from "effect";
import { getRequestEvent } from "@solidjs/web";
import { runServerEffect } from "./effect/runtime";
import { clearSessionEffect } from "./session";

// The body of the desk's sign-out server function (src/lib/desk/session.ts),
// which imports this module dynamically. Its own module, imported nowhere
// else, so the dynamic import splits it off; session.ts itself is imported
// statically by the middleware and the auth routes.

/** Clears the session cookie on the current response. */
function signOutEffect(): Effect.Effect<void> {
  return Effect.gen(function* () {
    const event = getRequestEvent();

    if (event === undefined) {
      return;
    }

    const cookies = yield* clearSessionEffect(event.request);

    for (const cookie of cookies) {
      event.response.headers.append("Set-Cookie", cookie);
    }
  });
}

/** Clears the session cookie on the current response. */
async function signOut(): Promise<void> {
  return runServerEffect(signOutEffect());
}

export { signOut, signOutEffect };
