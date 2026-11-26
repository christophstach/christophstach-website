import { Schema, SchemaGetter } from "effect";

const UnsetSettingSchema = Schema.Union([Schema.Literal(""), Schema.Undefined]).pipe(
  Schema.decodeTo(Schema.Undefined, {
    decode: SchemaGetter.transform(() => undefined),
    encode: SchemaGetter.transform(() => undefined),
  }),
);

/**
 * Exposes an Effect v4 Schema as a plain Standard Schema V1 object.
 * `@solidjs/vite-plugin` requires `typeof validator === "object"`, whereas
 * `Schema.toStandardSchemaV1` returns a callable schema function.
 */
function toEnvSchema<S extends Schema.ConstraintDecoder<unknown>>(schema: S) {
  return { "~standard": Schema.toStandardSchemaV1(schema)["~standard"] };
}

/** An optional setting: unset or empty (as an empty line in .env leaves it) is undefined. */
function optionalSetting<S extends Schema.Codec<string, string>>(schema: S) {
  return toEnvSchema(Schema.Union([UnsetSettingSchema, schema]));
}

// Server-only environment, read from process.env and validated at boot by
// @solidjs/vite-plugin; import it from "virtual:solid-env/server". There are
// no client variables. Generated types land in solid-env.d.ts.
const schema = {
  server: {
    // Signs and encrypts the desk session cookie. Comma-separated, newest first, so a secret
    // can rotate; each one at least 32 characters (openssl rand -base64 32).
    SESSION_SECRET: toEnvSchema(
      Schema.String.check(
        Schema.makeFilter(
          (value) =>
            value.split(",").every((secret) => secret.trim().length >= 32) ||
            "Every SESSION_SECRET must be at least 32 characters",
        ),
      ),
    ),
    // GitHub OAuth app. Callback URL: <origin>/auth/github
    GITHUB_CLIENT_ID: toEnvSchema(Schema.String.check(Schema.isMinLength(1))),
    GITHUB_CLIENT_SECRET: toEnvSchema(Schema.String.check(Schema.isMinLength(1))),
    // The numeric GitHub user ID of the only account allowed into /desk.
    DESK_GITHUB_USER_ID: toEnvSchema(
      Schema.String.check(Schema.isPattern(/^\d+$/u)).pipe(
        Schema.decodeTo(Schema.Int, {
          decode: SchemaGetter.transform((value) => Number(value)),
          encode: SchemaGetter.transform((value) => String(value)),
        }),
      ),
    ),
    // Chrome for printing PDFs off Linux, where the serverless Chromium can't run.
    CV_PDF_CHROME_PATH: optionalSetting(Schema.String.check(Schema.isMinLength(1))),
    // Renews ISR-cached responses on demand (Vercel). Optional locally.
    ISR_BYPASS_TOKEN: optionalSetting(Schema.String.check(Schema.isMinLength(32))),
    // Vercel Cron sends it to the scheduled page check (/api/desk/page-checks).
    // Unset, that endpoint answers 404.
    CRON_SECRET: optionalSetting(Schema.String.check(Schema.isMinLength(16))),
    // Postgres (Neon). Optional at boot; the database code throws when it's
    // missing at use. Migrations prefer the unpooled URL.
    DATABASE_URL: optionalSetting(Schema.String.check(Schema.isMinLength(1))),
    DATABASE_URL_UNPOOLED: optionalSetting(Schema.String.check(Schema.isMinLength(1))),
    // An OpenRouter key for scoring postings (src/server/posting-score.ts),
    // from an account without credit, so it can't be charged. Unset, scoring
    // doesn't run.
    OPENROUTER_API_KEY: optionalSetting(Schema.String.check(Schema.isMinLength(1))),
    // The OpenRouter model that scores postings, e.g.
    // "nvidia/nemotron-3.5-super-vl:free". Only a model whose every endpoint
    // is free runs; unset, the default one does.
    JOB_SCORE_MODEL: optionalSetting(Schema.String.check(Schema.isPattern(/^[\w.-]+\/[\w.:-]+$/u))),
  },
};

export default schema;
