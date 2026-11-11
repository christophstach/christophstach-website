import type { APIHandler } from "filesystem-routing/api";
import { env } from "virtual:solid-env/server";
import { paths } from "../../router";
import { signInCookies } from "../../server/session";

// Local development only: signs in as the desk owner without GitHub, so the
// desk can be opened (by hand or by an agent) on the dev server. The session
// is the same sealed cookie GitHub sign-in sets, so every guard runs as usual.
// A production build answers 404: import.meta.env.DEV is false there.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const GET: APIHandler = async ({ request }) => {
  const url = new URL(request.url);

  if (!import.meta.env.DEV || !LOCAL_HOSTS.has(url.hostname)) {
    return new Response("Not found", { status: 404 });
  }

  const session = await signInCookies(request, {
    githubId: env.DESK_GITHUB_USER_ID,
    login: "local-dev",
    avatarUrl: `https://avatars.githubusercontent.com/u/${env.DESK_GITHUB_USER_ID}`,
  });
  const headers = new Headers({ Location: new URL(paths.desk(), url).href });

  for (const cookie of session) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(undefined, { status: 302, headers });
};
