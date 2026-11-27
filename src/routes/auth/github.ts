import { Duration, Effect, Schema } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { GITHUB_SIGN_IN_PATH } from "../../data/endpoints";
import { paths } from "../../router";
import {
  type BadRequestError,
  ExternalFetchError,
  decodeUnknownEffect,
  runApiEffect,
} from "../../server/effect";
import { writeSessionEffect } from "../../server/session";
import { env } from "virtual:solid-env/server";

// GitHub OAuth for the desk: without a code, send the browser to GitHub; with
// one, exchange it, and sign in only the account in DESK_GITHUB_USER_ID.

const STATE_COOKIE = "oauth-state";
const GITHUB_OAUTH_TIMEOUT = Duration.seconds(10);
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

const TokenSchema = Schema.Struct({
  access_token: Schema.String,
});

const GithubUserSchema = Schema.Struct({
  id: Schema.Int,
  login: Schema.String,
  avatar_url: Schema.String,
});

function redirect(location: URL, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location.href });

  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(undefined, { status: 302, headers });
}

function stateCookie(value: string, maxAge: number): string {
  return `${STATE_COOKIE}=${value}; Path=/auth; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function requestState(request: Request): string | undefined {
  const cookie = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE}=`));

  return cookie?.slice(STATE_COOKIE.length + 1);
}

/** Starts the sign-in: a fresh state, remembered in a short-lived cookie. */
function authorize(url: URL): Response {
  const state = crypto.randomUUID();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");

  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", new URL(GITHUB_SIGN_IN_PATH, url).href);
  authorizeUrl.searchParams.set("state", state);

  return redirect(authorizeUrl, [stateCookie(state, 600)]);
}

function fetchJsonEffect(
  url: string,
  init: RequestInit,
  label: string,
): Effect.Effect<unknown, ExternalFetchError> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(url, { ...init, signal }),
      catch: (cause) =>
        new ExternalFetchError({
          message: `GitHub ${label} request failed.`,
          url,
          cause,
        }),
    });

    if (!response.ok) {
      return yield* new ExternalFetchError({
        message: `GitHub ${label} answered ${response.status} ${response.statusText}.`,
        url,
        upstreamStatus: response.status,
      });
    }

    return yield* Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: (cause) =>
        new ExternalFetchError({
          message: `GitHub ${label} returned unreadable JSON.`,
          url,
          cause,
        }),
    });
  }).pipe(
    Effect.timeout(GITHUB_OAUTH_TIMEOUT),
    Effect.catchTag(
      "TimeoutError",
      (cause) =>
        new ExternalFetchError({
          message: `GitHub ${label} request timed out.`,
          url,
          cause,
        }),
    ),
  );
}

/** Exchanges the code for the GitHub account behind it. */
function githubUserEffect(
  url: URL,
  code: string,
): Effect.Effect<typeof GithubUserSchema.Type, ExternalFetchError | BadRequestError> {
  return Effect.gen(function* () {
    const rawToken = yield* fetchJsonEffect(
      GITHUB_TOKEN_URL,
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: new URL(GITHUB_SIGN_IN_PATH, url).href,
        }),
      },
      "OAuth token",
    );
    const token = yield* decodeUnknownEffect(TokenSchema, rawToken);
    const rawUser = yield* fetchJsonEffect(
      GITHUB_USER_URL,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token.access_token}`,
          "User-Agent": "christophstach.de desk",
        },
      },
      "user profile",
    );

    return yield* decodeUnknownEffect(GithubUserSchema, rawUser);
  });
}

/** Finishes the sign-in with GitHub's code; any failure ends on the login page. */
function signInEffect(request: Request, url: URL, code: string): Effect.Effect<Response> {
  const clearState = stateCookie("", 0);

  return Effect.gen(function* () {
    const user = yield* githubUserEffect(url, code);

    // The desk is single-user: only the configured GitHub account gets a session.
    if (user.id !== env.DESK_GITHUB_USER_ID) {
      return redirect(new URL(paths.login({ error: "forbidden" }), url), [clearState]);
    }

    const session = yield* writeSessionEffect(request, {
      githubId: user.id,
      login: user.login,
      avatarUrl: user.avatar_url,
    });

    return redirect(new URL(paths.desk(), url), [clearState, ...session]);
  }).pipe(
    Effect.orElseSucceed(() =>
      redirect(new URL(paths.login({ error: "oauth" }), url), [clearState]),
    ),
  );
}

export const GET: APIHandler = ({ request }) =>
  runApiEffect(
    Effect.gen(function* () {
      const url = new URL(request.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (
        url.searchParams.has("error") ||
        (code !== null && (state === null || state !== requestState(request)))
      ) {
        return redirect(new URL(paths.login({ error: "oauth" }), url), [stateCookie("", 0)]);
      }

      return code === null ? authorize(url) : yield* signInEffect(request, url, code);
    }),
  );
