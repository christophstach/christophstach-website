import "server-only";
import type { ZodMiniType, output } from "zod/mini";
import { HttpError } from "./http";
import { getRequestEvent } from "@solidjs/web";
import { parseInput } from "./input";

/**
 * Reads one of this site's public data endpoints over HTTP, so the answer
 * comes from the CDN's ISR cache instead of the database, and parses it.
 */
async function fetchPublic<Schema extends ZodMiniType>(
  path: string,
  schema: Schema,
): Promise<output<Schema>> {
  const event = getRequestEvent();

  if (event === undefined) {
    throw new HttpError(500, `fetchPublic(${path}) needs a request.`);
  }

  const response = await fetch(new URL(path, event.request.url));

  if (!response.ok) {
    throw new HttpError(502, `${path} answered ${response.status} ${response.statusText}.`);
  }

  const body: unknown = await response.json();

  return parseInput(schema, body);
}

export { fetchPublic };
