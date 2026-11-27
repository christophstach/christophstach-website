import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { paths } from "../../router";
import { NotFoundError, runApiEffect } from "../../server/effect";
import { writeSessionEffect } from "../../server/session";
import { env } from "virtual:solid-env/server";

// Local development only: signs in as the desk owner without GitHub, so the
// desk can be opened (by hand or by an agent) on the dev server. The session
// is the same sealed cookie GitHub sign-in sets, so every guard runs as usual.
// A production build answers 404: import.meta.env.DEV is false there.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const GET: APIHandler = ({ request }) =>
  runApiEffect(
    Effect.gen(function* () {
      const url = new URL(request.url);

      if (!import.meta.env.DEV || !LOCAL_HOSTS.has(url.hostname)) {
        return yield* new NotFoundError({ message: "Not found" });
      }

      const session = yield* writeSessionEffect(request, {
        githubId: env.DESK_GITHUB_USER_ID,
        login: "local-dev",
        avatarUrl: `https://avatars.githubusercontent.com/u/${env.DESK_GITHUB_USER_ID}`,
      });
      const headers = new Headers({ Location: new URL(paths.desk(), url).href });

      for (const cookie of session) {
        headers.append("Set-Cookie", cookie);
      }

      return new Response(undefined, { status: 302, headers });
    }),
  );
