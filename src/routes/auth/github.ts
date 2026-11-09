import { number, object, string } from "zod/mini";
import type { APIHandler } from "filesystem-routing/api";
import { env } from "virtual:solid-env/server";
import { parseInput } from "../../server/input";
import { signInCookies } from "../../server/session";

// GitHub OAuth for the desk: without a code, send the browser to GitHub; with
// one, exchange it, and sign in only the account in DESK_GITHUB_USER_ID.

const STATE_COOKIE = "oauth-state";
const tokenSchema = object({ access_token: string() });
const githubUserSchema = object({ id: number(), login: string(), avatar_url: string() });

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
  authorizeUrl.searchParams.set("redirect_uri", new URL("/auth/github", url).href);
  authorizeUrl.searchParams.set("state", state);

  return redirect(authorizeUrl, [stateCookie(state, 600)]);
}

/** Exchanges the code for the GitHub account behind it. */
async function githubUser(url: URL, code: string) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL("/auth/github", url).href,
    }),
  });
  const token = parseInput(tokenSchema, await tokenResponse.json());
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "christophstach.de desk",
    },
  });

  return parseInput(githubUserSchema, await userResponse.json());
}

/** Finishes the sign-in with GitHub's code; any failure ends on the login page. */
async function signIn(request: Request, url: URL, code: string): Promise<Response> {
  const clearState = stateCookie("", 0);

  try {
    const user = await githubUser(url, code);

    // The desk is single-user: only the configured GitHub account gets a session.
    if (user.id !== env.DESK_GITHUB_USER_ID) {
      return redirect(new URL("/login?error=forbidden", url), [clearState]);
    }

    const session = await signInCookies(request, {
      githubId: user.id,
      login: user.login,
      avatarUrl: user.avatar_url,
    });

    return redirect(new URL("/desk", url), [clearState, ...session]);
  } catch {
    return redirect(new URL("/login?error=oauth", url), [clearState]);
  }
}

export const GET: APIHandler = ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (
    url.searchParams.has("error") ||
    (code !== null && (state === null || state !== requestState(request)))
  ) {
    return redirect(new URL("/login?error=oauth", url), [stateCookie("", 0)]);
  }

  return code === null ? authorize(url) : signIn(request, url, code);
};
