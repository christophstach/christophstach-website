import "server-only";
import type { DeskUser } from "../data/desk-user";
import { HttpError } from "./http";
import { getRequestEvent } from "@solidjs/web";
import { readDeskUser } from "./session";

/**
 * The signed-in desk user, or a 401. Every desk server function and desk
 * endpoint calls it first: the page guard doesn't cover them.
 */
async function requireUser(request?: Request): Promise<DeskUser> {
  const from = request ?? getRequestEvent()?.request;
  const user = from === undefined ? undefined : await readDeskUser(from);

  if (user === undefined) {
    throw new HttpError(401, "Sign in to use the desk.");
  }

  return user;
}

export { requireUser };
