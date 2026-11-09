import { minLength, optional, pipe, refine, regex, string, transform } from "zod/mini";

// Server-only environment, read from process.env and validated at boot by
// @solidjs/vite-plugin; import it from "virtual:solid-env/server". There are
// no client variables. Generated types land in solid-env.d.ts.
const schema = {
  server: {
    // Seals the session cookie. Comma-separated, newest first, so a secret
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
    CV_PDF_CHROME_PATH: optional(string().check(minLength(1))),
    // Renews ISR-cached responses on demand (Vercel). Optional locally.
    ISR_BYPASS_TOKEN: optional(string().check(minLength(32))),
    // Postgres (Neon). Optional at boot; the database code throws when it's
    // missing at use. Migrations prefer the unpooled URL.
    DATABASE_URL: optional(string().check(minLength(1))),
    DATABASE_URL_UNPOOLED: optional(string().check(minLength(1))),
  },
};

export default schema;
