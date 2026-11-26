import "server-only";
import { Effect } from "effect";
import { getRequestEvent } from "@solidjs/web";
import { env } from "virtual:solid-env/server";
import type { DeskUser } from "../data/desk-user";
import { ForbiddenError, UnauthorizedError } from "./effect/errors";
import { runServerEffect } from "./effect/runtime";
import { readSessionEffect } from "./session";

/** The signed-in desk user for the current or provided request, or undefined. */
function getOptionalUserEffect(request?: Request): Effect.Effect<DeskUser | undefined> {
  return Effect.gen(function* () {
    const from = request ?? getRequestEvent()?.request;

    if (from === undefined) {
      return undefined;
    }

    return yield* readSessionEffect(from);
  });
}

/**
 * The signed-in desk user, failing with `UnauthorizedError` (401) if absent
 * or `ForbiddenError` (403) if the session does not belong to the desk owner.
 * Every desk server function and desk endpoint calls it first: the page guard
 * doesn't cover them.
 */
function requireUserEffect(
  request?: Request,
): Effect.Effect<DeskUser, UnauthorizedError | ForbiddenError> {
  return Effect.gen(function* () {
    const user = yield* getOptionalUserEffect(request);

    if (user === undefined) {
      return yield* new UnauthorizedError({ message: "Sign in to use the desk." });
    }

    if (user.githubId !== env.DESK_GITHUB_USER_ID) {
      return yield* new ForbiddenError({
        message: "This account is not allowed to use the desk.",
      });
    }

    return user;
  });
}

/**
 * The signed-in desk user, or a 401/403 HttpError. Every desk server function
 * and desk endpoint calls it first: the page guard doesn't cover them.
 */
async function requireUser(request?: Request): Promise<DeskUser> {
  return runServerEffect(requireUserEffect(request));
}

export { getOptionalUserEffect, requireUser, requireUserEffect };
