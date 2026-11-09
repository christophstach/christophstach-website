import "server-only";
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
import { HttpError } from "./http";

// URL slug: lowercase words joined by single hyphens, e.g. "ai-platform".
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/**
 * Parses input from outside (a request body, a server function argument)
 * with a schema; the first problem becomes a 400 with the schema's message.
 */
function parseInput<Schema extends ZodMiniType>(schema: Schema, value: unknown): output<Schema> {
  const result = safeParse(schema, value);

  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid input.");
  }

  return result.data;
}

/** A string, trimmed. */
function trimmed(message: string) {
  return string(message).check(trim());
}

/** A string that isn't empty once trimmed. */
function text(message: string) {
  return string(message).check(trim(), minLength(1, message));
}

/** A string matching a pattern. */
function matching(pattern: RegExp, message: string) {
  return string(message).check(regex(pattern, message));
}

/** An empty string, or one matching a pattern (e.g. an optional date). */
function emptyOrMatching(pattern: RegExp, message: string) {
  const empty = literal("", message);

  return union([empty, matching(pattern, message)], message);
}

/** A list of strings, trimmed, without empty items. */
function stringList(message: string) {
  return pipe(
    array(string(message), message),
    transform((items: string[]) => items.map((item) => item.trim()).filter((item) => item !== "")),
  );
}

/** Throws a 400 unless the id is a URL slug, e.g. "ai-platform". */
function requireSlug(id: string): string {
  if (!safeParse(matching(SLUG, "slug"), id).success) {
    throw new HttpError(400, `"${id}" is no valid id: use lowercase letters, digits and hyphens.`);
  }

  return id;
}

/** Throws a 400 when an id appears twice. */
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
  emptyOrMatching,
  matching,
  parseInput,
  requireSlug,
  requireUnique,
  stringList,
  text,
  trimmed,
};
