import "server-only";
import { Effect, Schema, SchemaTransformation } from "effect";
import { BadRequestError } from "./effect/errors";
import { decodeUnknownEffect } from "./effect/schema";

// URL slug: lowercase words joined by single hyphens, e.g. "ai-platform".
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

// ---------------------------------------------------------------------------
// Effect v4 Schema building blocks and request-body helpers
// ---------------------------------------------------------------------------

/** A string, trimmed. */
function trimmedSchema(message: string) {
  return Schema.String.annotate({ message }).pipe(
    Schema.decodeTo(Schema.String, SchemaTransformation.trim()),
  );
}

/** A string that isn't empty once trimmed. */
function textSchema(message: string) {
  return Schema.String.annotate({ message }).pipe(
    Schema.decodeTo(
      Schema.String.pipe(Schema.check(Schema.isNonEmpty({ message }))),
      SchemaTransformation.trim(),
    ),
  );
}

/** A string matching a pattern. */
function matchingSchema(pattern: RegExp, message: string) {
  return Schema.String.annotate({ message }).pipe(
    Schema.check(Schema.isPattern(pattern, { message })),
  );
}

/** An empty string, or one matching a pattern (e.g. an optional date). */
function emptyOrMatchingSchema(pattern: RegExp, message: string) {
  return Schema.Union([Schema.Literal(""), matchingSchema(pattern, message)]).annotate({
    message,
  });
}

/** A list of strings, trimmed, without empty items. */
function stringListSchema(message: string) {
  return Schema.Array(Schema.String.annotate({ message }))
    .annotate({ message })
    .pipe(
      Schema.decodeTo(
        Schema.mutable(Schema.Array(Schema.String)),
        SchemaTransformation.transform({
          decode: (items) => items.map((item) => item.trim()).filter((item) => item !== ""),
          encode: (items) => items,
        }),
      ),
    );
}

/** A positive integer (> 0). */
function positiveIntSchema(message: string) {
  return Schema.Int.annotate({ message }).pipe(Schema.check(Schema.isGreaterThan(0, { message })));
}

/** A YYYY-MM-DD ISO calendar date string. */
function isoDateSchema(message: string) {
  return matchingSchema(ISO_DATE_PATTERN, message);
}

/** A trimmed HTTP or HTTPS URL string. */
function urlSchema(message: string) {
  return trimmedSchema(message).pipe(
    Schema.check(
      Schema.makeFilter(
        (value) => {
          try {
            const parsed = new URL(value);

            return parsed.protocol === "http:" || parsed.protocol === "https:";
          } catch {
            return false;
          }
        },
        { message },
      ),
    ),
  );
}

/** A URL slug: lowercase letters, digits, and single hyphens. */
function slugSchema(message = "Invalid id: use lowercase letters, digits and hyphens.") {
  return matchingSchema(SLUG_PATTERN, message);
}

/**
 * Decodes an unknown input (a request body, a server function argument) with an
 * Effect v4 Schema, failing with `BadRequestError`.
 */
function decodeBodyEffect<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  value: unknown,
  messagePrefix?: string,
): Effect.Effect<S["Type"], BadRequestError> {
  return decodeUnknownEffect(schema, value, messagePrefix);
}

/** Parses a Request's JSON body, failing with `BadRequestError` if it isn't valid JSON. */
function readJsonEffect(request: Request): Effect.Effect<unknown, BadRequestError> {
  return Effect.tryPromise({
    try: () => request.json(),
    catch: (cause) => new BadRequestError({ message: "The body is no JSON.", cause }),
  });
}

/** Reads a Request's JSON body and decodes it with an Effect v4 Schema. */
function readJsonBodyEffect<S extends Schema.ConstraintDecoder<unknown>>(
  request: Request,
  schema: S,
  messagePrefix?: string,
): Effect.Effect<S["Type"], BadRequestError> {
  return Effect.gen(function* () {
    const body = yield* readJsonEffect(request);

    return yield* decodeBodyEffect(schema, body, messagePrefix);
  });
}

/** Fails with `BadRequestError` unless the id is a URL slug, e.g. "ai-platform". */
function requireSlugEffect(id: string): Effect.Effect<string, BadRequestError> {
  return Effect.gen(function* () {
    if (!SLUG_PATTERN.test(id)) {
      return yield* new BadRequestError({
        message: `"${id}" is no valid id: use lowercase letters, digits and hyphens.`,
      });
    }

    return id;
  });
}

/** Fails with `BadRequestError` when an id appears twice. */
function requireUniqueEffect(
  ids: readonly string[],
  what: string,
): Effect.Effect<void, BadRequestError> {
  return Effect.suspend(() => {
    const seen = new Set<string>();

    for (const id of ids) {
      if (seen.has(id)) {
        return Effect.fail(
          new BadRequestError({
            message: `The ${what} id "${id}" is used twice.`,
          }),
        );
      }

      seen.add(id);
    }

    return Effect.void;
  });
}

export {
  ISO_DATE_PATTERN,
  SLUG_PATTERN,
  decodeBodyEffect,
  emptyOrMatchingSchema,
  isoDateSchema,
  matchingSchema,
  positiveIntSchema,
  readJsonBodyEffect,
  readJsonEffect,
  requireSlugEffect,
  requireUniqueEffect,
  slugSchema,
  stringListSchema,
  textSchema,
  trimmedSchema,
  urlSchema,
};
