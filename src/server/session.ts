import "server-only";
import { H3Event, clearSession, getSession, updateSession } from "nitro/h3";
import type { DeskUser } from "../data/desk-user";
import type { SessionConfig } from "nitro/h3";
import { deskUserSchema } from "../data/desk-user";
import { env } from "virtual:solid-env/server";
import { safeParse } from "zod/mini";

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
async function readDeskUser(request: Request): Promise<DeskUser | undefined> {
  // getSession leaves the session empty when the cookie doesn't unseal with
  // that secret, so at most one of them yields a user.
  const sessions = await Promise.all(
    secrets().map((secret) => getSession(new H3Event(request), sessionConfig(secret))),
  );

  for (const session of sessions) {
    const user = safeParse(deskUserSchema, session.data.user);

    if (user.success) {
      return user.data;
    }
  }

  return undefined;
}

/** The Set-Cookie headers that sign a user in. */
async function signInCookies(request: Request, user: DeskUser): Promise<string[]> {
  const [newest] = secrets();

  if (newest === undefined) {
    throw new Error("SESSION_SECRET is empty.");
  }

  const event = new H3Event(request);

  await updateSession(event, sessionConfig(newest), { user });

  return event.res.headers.getSetCookie();
}

/**
 * A desk session cookie, `name=value`, for the server's own Chrome to print
 * desk pages when no visitor's session is at hand (the scheduled page check).
 * Never send it to a client.
 */
async function serverSessionCookie(request: Request, user: DeskUser): Promise<string> {
  const [cookie] = await signInCookies(request, user);
  const pair = cookie?.split(";")[0];

  if (pair === undefined || pair === "") {
    throw new Error("Sealing the session made no cookie.");
  }

  return pair;
}

/** The Set-Cookie headers that sign out. */
async function signOutCookies(request: Request): Promise<string[]> {
  const event = new H3Event(request);

  await clearSession(event, sessionConfig(secrets()[0] ?? ""));

  return event.res.headers.getSetCookie();
}

export { readDeskUser, serverSessionCookie, signInCookies, signOutCookies };
