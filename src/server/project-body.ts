import "server-only";
import { Cause, Effect, Exit, Result, Schema } from "effect";
import type { ProjectRecord } from "../data/projects";
import { type BadRequestError, toHttpError } from "./effect";
import {
  decodeBodyEffect,
  requireSlugEffect,
  stringListSchema,
  textSchema,
  trimmedSchema,
} from "./input";

const NOT_PROJECT = "Not a project.";

const ProjectBodySchema = Schema.Struct({
  // A tab opened before names existed sends none: it falls back to the title.
  name: Schema.optionalKey(textSchema(NOT_PROJECT)),
  note: Schema.optionalKey(trimmedSchema(NOT_PROJECT)),
  title: textSchema(NOT_PROJECT),
  description: trimmedSchema(NOT_PROJECT),
  tech: stringListSchema(NOT_PROJECT),
  url: trimmedSchema(NOT_PROJECT),
}).annotate({ message: NOT_PROJECT });

function runSyncBody<A>(effect: Effect.Effect<A, BadRequestError>): A {
  const exit = Effect.runSyncExit(effect);

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findError(exit.cause);

  if (Result.isSuccess(failure)) {
    throw toHttpError(failure.success);
  }

  throw Cause.squash(exit.cause);
}

/** Checks the shape of a project sent by the desk; the route's id wins. */
function parseProjectBodyEffect(
  id: string,
  body: unknown,
): Effect.Effect<ProjectRecord, BadRequestError> {
  return Effect.gen(function* () {
    yield* requireSlugEffect(id);

    const project = yield* decodeBodyEffect(ProjectBodySchema, body ?? {});

    return {
      id,
      name: project.name ?? project.title,
      note: project.note ?? "",
      title: project.title,
      description: project.description,
      tech: project.tech,
      url: project.url,
    };
  });
}

/** Checks the shape of a project sent by the desk; the route's id wins. */
function parseProjectBody(id: string, body: unknown): ProjectRecord {
  return runSyncBody(parseProjectBodyEffect(id, body));
}

export { ProjectBodySchema, parseProjectBody, parseProjectBodyEffect };
