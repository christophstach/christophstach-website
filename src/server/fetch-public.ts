import "server-only";
import { Effect, type Schema } from "effect";
import { getRequestEvent } from "@solidjs/web";
import type { ZodMiniType, output } from "zod/mini";
import { type BadRequestError, ExternalFetchError } from "./effect/errors";
import { runServerEffect } from "./effect/runtime";
import { decodeUnknownEffect } from "./effect/schema";
import { parseInput } from "./input";

const PUBLIC_FETCH_TIMEOUT = "10 seconds" as const;

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

    // Previews sit behind Vercel's deployment protection: pass the visitor's
    // access (its cookie, or the bypass header) on to the call to ourselves.
    const headers = new Headers();

    for (const name of ["cookie", "x-vercel-protection-bypass"]) {
      const value = event.request.headers.get(name);

      if (value !== null) {
        headers.set(name, value);
      }
    }

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

/**
 * Temporary W2 compat: reads a public data endpoint and parses it with a
 * zod/mini schema. Will be removed once W5 migrates `src/routes/(site)/index.tsx`
 * and `curriculum.tsx` to `fetchPublicEffect` with Effect v4 Schemas.
 */
async function fetchPublic<S extends ZodMiniType>(path: string, schema: S): Promise<output<S>> {
  const body = await runServerEffect(fetchPublicJsonEffect(path));

  return parseInput(schema, body);
}

export { fetchPublic, fetchPublicEffect };
