import "server-only";
import { Effect, Option, Schema } from "effect";
import { H3Event, clearSession, getSession, updateSession } from "nitro/h3";
import type { SessionConfig } from "nitro/h3";
import { env } from "virtual:solid-env/server";
import { DeskUserSchema } from "../data/desk-user";
import type { DeskUser } from "../data/desk-user";
import { ConfigError } from "./effect/errors";
import { runServerEffect } from "./effect/runtime";

// The desk session: h3's sealed cookie (encrypted and signed).
// SESSION_SECRET is comma-separated, newest first: the first seals, every one
// unseals, so a secret can rotate without signing anyone out.

const SESSION_NAME = "desk-session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secrets(): string[] {
  return env.SESSION_SECRET.split(",")
    .map((secret) => secret.trim())
    .filter((secret) => secret !== "");
}

function sessionConfig(password: string): SessionConfig {
  return {
    name: SESSION_NAME,
    password,
    maxAge: MAX_AGE,
    sessionHeader: false,
    cookie: { path: "/", httpOnly: true, secure: true, sameSite: "lax" },
  };
}

/** The signed-in desk user of a request, or undefined. */
function readSessionEffect(request: Request): Effect.Effect<DeskUser | undefined> {
  return Effect.gen(function* () {
    // getSession leaves the session empty when the cookie doesn't unseal with
    // that secret, so at most one of them yields a user.
    const sessions = yield* Effect.forEach(
      secrets(),
      (secret) => Effect.promise(() => getSession(new H3Event(request), sessionConfig(secret))),
      { concurrency: "unbounded" },
    );

    for (const session of sessions) {
      const decoded = Schema.decodeUnknownOption(DeskUserSchema)(session.data.user);

      if (Option.isSome(decoded)) {
        return decoded.value;
      }
    }

    return undefined;
  });
}

/** The Set-Cookie headers that sign a user in. */
function writeSessionEffect(
  request: Request,
  user: DeskUser,
): Effect.Effect<string[], ConfigError> {
  return Effect.gen(function* () {
    const [newest] = secrets();

    if (newest === undefined) {
      return yield* new ConfigError({ message: "SESSION_SECRET is empty." });
    }

    const event = new H3Event(request);

    yield* Effect.promise(() => updateSession(event, sessionConfig(newest), { user }));

    return event.res.headers.getSetCookie();
  });
}

/**
 * A desk session cookie, `name=value`, for the server's own Chrome to print
 * desk pages when no visitor's session is at hand (the scheduled page check).
 * Never send it to a client.
 */
function serverSessionCookieEffect(
  request: Request,
  user: DeskUser,
): Effect.Effect<string, ConfigError> {
  return Effect.gen(function* () {
    const [cookie] = yield* writeSessionEffect(request, user);
    const pair = cookie?.split(";")[0];

    if (pair === undefined || pair === "") {
      return yield* new ConfigError({ message: "Sealing the session made no cookie." });
    }

    return pair;
  });
}

/** The Set-Cookie headers that sign out. */
function clearSessionEffect(request: Request): Effect.Effect<string[]> {
  return Effect.gen(function* () {
    const event = new H3Event(request);

    yield* Effect.promise(() => clearSession(event, sessionConfig(secrets()[0] ?? "")));

    return event.res.headers.getSetCookie();
  });
}

/** The signed-in desk user of a request, or undefined. */
async function readDeskUser(request: Request): Promise<DeskUser | undefined> {
  return runServerEffect(readSessionEffect(request));
}

/** The Set-Cookie headers that sign a user in. */
async function signInCookies(request: Request, user: DeskUser): Promise<string[]> {
  return runServerEffect(writeSessionEffect(request, user));
}

/**
 * A desk session cookie, `name=value`, for the server's own Chrome to print
 * desk pages when no visitor's session is at hand (the scheduled page check).
 * Never send it to a client.
 */
async function serverSessionCookie(request: Request, user: DeskUser): Promise<string> {
  return runServerEffect(serverSessionCookieEffect(request, user));
}

/** The Set-Cookie headers that sign out. */
async function signOutCookies(request: Request): Promise<string[]> {
  return runServerEffect(clearSessionEffect(request));
}

export {
  clearSessionEffect,
  readDeskUser,
  readSessionEffect,
  serverSessionCookie,
  serverSessionCookieEffect,
  signInCookies,
  signOutCookies,
  writeSessionEffect,
};
