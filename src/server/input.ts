import "server-only";
import { Effect, Schema, SchemaTransformation } from "effect";
import type { ZodMiniType, output } from "zod/mini";
import {
  array,
  literal,
  minLength,
  pipe,
  regex,
  safeParse,
  string,
  transform,
  trim,
  union,
} from "zod/mini";
import { BadRequestError } from "./effect/errors";
import { decodeUnknownEffect } from "./effect/schema";
import { HttpError } from "./http";

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

// ---------------------------------------------------------------------------
// Temporary W3 compatibility helpers (zod/mini) — to be removed in W6 once
// all body parsers and callers have migrated to Effect v4 Schemas.
// ---------------------------------------------------------------------------

/**
 * Temporary W3 compat: parses input with a zod/mini schema; the first problem
 * becomes a 400 with the schema's message. Remove in W6.
 */
function parseInput<S extends ZodMiniType>(schema: S, value: unknown): output<S> {
  const result = safeParse(schema, value);

  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid input.");
  }

  return result.data;
}

/** Temporary W3 compat: a string, trimmed. Remove in W6. */
function trimmed(message: string) {
  return string(message).check(trim());
}

/** Temporary W3 compat: a string that isn't empty once trimmed. Remove in W6. */
function text(message: string) {
  return string(message).check(trim(), minLength(1, message));
}

/** Temporary W3 compat: a string matching a pattern. Remove in W6. */
function matching(pattern: RegExp, message: string) {
  return string(message).check(regex(pattern, message));
}

/** Temporary W3 compat: an empty string, or one matching a pattern. Remove in W6. */
function emptyOrMatching(pattern: RegExp, message: string) {
  const empty = literal("", message);

  return union([empty, matching(pattern, message)], message);
}

/** Temporary W3 compat: a list of strings, trimmed, without empty items. Remove in W6. */
function stringList(message: string) {
  return pipe(
    array(string(message), message),
    transform((items: string[]) => items.map((item) => item.trim()).filter((item) => item !== "")),
  );
}

/** Temporary W3 compat: throws a 400 unless the id is a URL slug. Remove in W6. */
function requireSlug(id: string): string {
  if (!SLUG_PATTERN.test(id)) {
    throw new HttpError(400, `"${id}" is no valid id: use lowercase letters, digits and hyphens.`);
  }

  return id;
}

/** Temporary W3 compat: throws a 400 when an id appears twice. Remove in W6. */
function requireUnique(ids: string[], what: string) {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      throw new HttpError(400, `The ${what} id "${id}" is used twice.`);
    }

    seen.add(id);
  }
}

export {
  ISO_DATE_PATTERN,
  SLUG_PATTERN,
  decodeBodyEffect,
  emptyOrMatching,
  emptyOrMatchingSchema,
  isoDateSchema,
  matching,
  matchingSchema,
  parseInput,
  positiveIntSchema,
  readJsonBodyEffect,
  readJsonEffect,
  requireSlug,
  requireSlugEffect,
  requireUnique,
  requireUniqueEffect,
  slugSchema,
  stringList,
  stringListSchema,
  text,
  textSchema,
  trimmed,
  trimmedSchema,
  urlSchema,
};
