import "server-only";
import { Effect, type Schema } from "effect";
import { getRequestEvent } from "@solidjs/web";
import { readCookie } from "../lib/cookies";
import { type BadRequestError, ExternalFetchError } from "./effect/errors";
import { decodeUnknownEffect } from "./effect/schema";

const PUBLIC_FETCH_TIMEOUT = "10 seconds" as const;
const VERCEL_JWT_COOKIE = "_vercel_jwt";
const VERCEL_BYPASS_HEADER = "x-vercel-protection-bypass";

/**
 * Extracts only Vercel preview-protection credentials (`_vercel_jwt` cookie and
 * `x-vercel-protection-bypass` header) so internal self-fetches never leak
 * session or preference cookies (`desk-session`, `color-mode`) to public/ISR routes.
 */
function previewProtectionHeaders(request: Request): Headers {
  const headers = new Headers();
  let vercelJwt: string | undefined;

  try {
    vercelJwt = readCookie(request.headers.get("cookie"), VERCEL_JWT_COOKIE);
  } catch {
    vercelJwt = undefined;
  }

  if (vercelJwt !== undefined && vercelJwt !== "") {
    headers.set("cookie", `${VERCEL_JWT_COOKIE}=${encodeURIComponent(vercelJwt)}`);
  }

  const bypass = request.headers.get(VERCEL_BYPASS_HEADER);

  if (bypass !== null) {
    headers.set(VERCEL_BYPASS_HEADER, bypass);
  }

  return headers;
}

/**
 * Fetches one of this site's public JSON endpoints over HTTP so the answer
 * comes from the CDN's ISR cache instead of the database.
 */
function fetchPublicJsonEffect(path: string): Effect.Effect<unknown, ExternalFetchError> {
  return Effect.gen(function* () {
    const event = getRequestEvent();

    if (event === undefined) {
      return yield* new ExternalFetchError({
        message: `fetchPublic(${path}) needs a request.`,
        url: path,
      });
    }

    // Previews sit behind Vercel's deployment protection: forward only the
    // preview cookie or bypass header, never desk-session or color-mode.
    const headers = previewProtectionHeaders(event.request);

    const target = new URL(path, event.request.url);
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(target, { headers, signal }),
      catch: (cause) =>
        new ExternalFetchError({
          message: `Failed to fetch ${path}.`,
          url: target.href,
          cause,
        }),
    }).pipe(
      Effect.timeout(PUBLIC_FETCH_TIMEOUT),
      Effect.catchTag(
        "TimeoutError",
        (cause) =>
          new ExternalFetchError({
            message: `${path} timed out.`,
            url: target.href,
            cause,
          }),
      ),
    );

    if (!response.ok) {
      return yield* new ExternalFetchError({
        message: `${path} answered ${response.status} ${response.statusText}.`,
        url: target.href,
        upstreamStatus: response.status,
      });
    }

    return yield* Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: (cause) =>
        new ExternalFetchError({
          message: `${path} did not return valid JSON.`,
          url: target.href,
          cause,
        }),
    });
  });
}

/**
 * Reads one of this site's public data endpoints over HTTP, so the answer
 * comes from the CDN's ISR cache instead of the database, and decodes it with
 * an Effect v4 Schema.
 */
function fetchPublicEffect<S extends Schema.ConstraintDecoder<unknown>>(
  path: string,
  schema: S,
): Effect.Effect<S["Type"], ExternalFetchError | BadRequestError> {
  return Effect.gen(function* () {
    const body = yield* fetchPublicJsonEffect(path);

    return yield* decodeUnknownEffect(schema, body);
  });
}

export { fetchPublicEffect, previewProtectionHeaders };
