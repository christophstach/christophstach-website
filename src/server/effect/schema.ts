import "server-only";
import { Effect, Schema } from "effect";
import { BadRequestError } from "./errors";

/** Formats an Effect v4 `SchemaError` into a concise human-readable message. */
export function formatSchemaError(error: Schema.SchemaError): string {
  return error.message;
}

/** Decodes an unknown input with an Effect v4 Schema, failing with `BadRequestError`. */
export function decodeUnknownEffect<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  input: unknown,
  messagePrefix?: string,
): Effect.Effect<S["Type"], BadRequestError> {
  return Schema.decodeUnknownEffect(schema)(input).pipe(
    Effect.mapError((error) => {
      const detail = formatSchemaError(error);
      const message = messagePrefix === undefined ? detail : `${messagePrefix}: ${detail}`;

      return new BadRequestError({ message, cause: error });
    }),
  );
}

/** Parses a JSON string and decodes it with an Effect v4 Schema, failing with `BadRequestError`. */
export function decodeJsonEffect<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  raw: string,
  messagePrefix?: string,
): Effect.Effect<S["Type"], BadRequestError> {
  return decodeUnknownEffect(Schema.fromJsonString(schema), raw, messagePrefix);
}
