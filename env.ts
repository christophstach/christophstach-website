import {
  undefined as _undefined,
  literal,
  minLength,
  pipe,
  refine,
  regex,
  string,
  transform,
  union,
} from "zod/mini";
import type { ZodMiniString } from "zod/mini";

/** An optional setting: unset or empty (as an empty line in .env leaves it) is undefined. */
function optionalSetting(schema: ZodMiniString) {
  // An empty value or none at all becomes undefined (an empty body returns it).
  const unset = pipe(
    union([literal(""), _undefined()]),
    transform((): undefined => {}),
  );

  return union([unset, schema]);
}

// Server-only environment, read from process.env and validated at boot by
// @solidjs/vite-plugin; import it from "virtual:solid-env/server". There are
// no client variables. Generated types land in solid-env.d.ts.
const schema = {
  server: {
    // Signs and encrypts the desk session cookie. Comma-separated, newest first, so a secret
    // can rotate; each one at least 32 characters (openssl rand -base64 32).
    SESSION_SECRET: string().check(
      refine((value) => value.split(",").every((secret) => secret.trim().length >= 32), {
        message: "Every SESSION_SECRET must be at least 32 characters",
      }),
    ),
    // GitHub OAuth app. Callback URL: <origin>/auth/github
    GITHUB_CLIENT_ID: string().check(minLength(1)),
    GITHUB_CLIENT_SECRET: string().check(minLength(1)),
    // The numeric GitHub user ID of the only account allowed into /desk.
    DESK_GITHUB_USER_ID: pipe(string().check(regex(/^\d+$/u)), transform(Number)),
    // Chrome for printing PDFs off Linux, where the serverless Chromium can't run.
    CV_PDF_CHROME_PATH: optionalSetting(string().check(minLength(1))),
    // Renews ISR-cached responses on demand (Vercel). Optional locally.
    ISR_BYPASS_TOKEN: optionalSetting(string().check(minLength(32))),
    // Vercel Cron sends it to the scheduled page check (/api/desk/page-checks).
    // Unset, that endpoint answers 404.
    CRON_SECRET: optionalSetting(string().check(minLength(16))),
    // Postgres (Neon). Optional at boot; the database code throws when it's
    // missing at use. Migrations prefer the unpooled URL.
    DATABASE_URL: optionalSetting(string().check(minLength(1))),
    DATABASE_URL_UNPOOLED: optionalSetting(string().check(minLength(1))),
  },
};

export default schema;
