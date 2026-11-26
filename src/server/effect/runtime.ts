import "server-only";
import { Cause, type Effect, Exit, ManagedRuntime, Result } from "effect";
import { type Database, DatabaseLive } from "./db";
import { type AppError, toHttpError } from "./errors";

export type AppServices = Database;

export const AppLayer = DatabaseLive;

type AppRuntime = ManagedRuntime.ManagedRuntime<AppServices, never>;

let appRuntime: AppRuntime | undefined;

/** Lazily constructs and reuses the server `ManagedRuntime`. */
export function getAppRuntime(): AppRuntime {
  appRuntime ??= ManagedRuntime.make(AppLayer);

  return appRuntime;
}

function rethrowDefect(cause: Cause.Cause<unknown>): never {
  const defect = Cause.squash(cause);

  if (defect instanceof Error) {
    throw defect;
  }

  throw new Error(Cause.pretty(cause), { cause: defect });
}

/**
 * Edge runner for `"use server"` functions and SSR data loaders.
 *
 * Expected `AppError` failures are converted via `toHttpError` (preserving
 * `markSafeError` across Solid 2 RPC boundaries); unexpected defects are
 * rethrown cleanly.
 */
export async function runServerEffect<A, E extends AppError>(
  effect: Effect.Effect<A, E, AppServices>,
): Promise<A> {
  const exit = await getAppRuntime().runPromiseExit(effect);

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findError(exit.cause);

  if (Result.isSuccess(failure)) {
    throw toHttpError(failure.success);
  }

  return rethrowDefect(exit.cause);
}

/**
 * Edge runner for HTTP API route handlers (`GET`, `POST`, etc.).
 *
 * Expected `AppError` failures map directly to `new Response(err.message, { status: err.status })`;
 * unexpected defects are rethrown cleanly.
 */
export async function runApiEffect<E extends AppError>(
  effect: Effect.Effect<Response, E, AppServices>,
): Promise<Response> {
  const exit = await getAppRuntime().runPromiseExit(effect);

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findError(exit.cause);

  if (Result.isSuccess(failure)) {
    const httpError = toHttpError(failure.success);

    return new Response(httpError.message, { status: httpError.status });
  }

  return rethrowDefect(exit.cause);
}
