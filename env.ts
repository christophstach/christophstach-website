import { check, minLength, optional, pipe, regex, string, transform } from "valibot";

// Server-only environment, read from process.env and validated at boot by
// @solidjs/vite-plugin; import it from "virtual:solid-env/server". There are
// no client variables. Generated types land in solid-env.d.ts.
const schema = {
  server: {
    // Seals the session cookie. Comma-separated, newest first, so a secret
    // can rotate; each one at least 32 characters (openssl rand -base64 32).
    SESSION_SECRET: pipe(
      string(),
      check(
        (value) => value.split(",").every((secret) => secret.trim().length >= 32),
        "Every SESSION_SECRET must be at least 32 characters",
      ),
    ),
    // GitHub OAuth app. Callback URL: <origin>/auth/github
    GITHUB_CLIENT_ID: pipe(string(), minLength(1)),
    GITHUB_CLIENT_SECRET: pipe(string(), minLength(1)),
    // The numeric GitHub user ID of the only account allowed into /desk.
    DESK_GITHUB_USER_ID: pipe(string(), regex(/^\d+$/u), transform(Number)),
    // Chrome for printing PDFs off Linux, where the serverless Chromium can't run.
    CV_PDF_CHROME_PATH: optional(pipe(string(), minLength(1))),
    // Renews ISR-cached responses on demand (Vercel). Optional locally.
    ISR_BYPASS_TOKEN: optional(pipe(string(), minLength(32))),
    // Postgres (Neon). Optional at boot; the database code throws when it's
    // missing at use. Migrations prefer the unpooled URL.
    DATABASE_URL: optional(pipe(string(), minLength(1))),
    DATABASE_URL_UNPOOLED: optional(pipe(string(), minLength(1))),
  },
};

export default schema;
