import "server-only";
import { Data } from "effect";
import { HttpError } from "../http";

/**
 * Typed application and infrastructure errors.
 *
 * Every `message` must be safe to surface to the client (written in our own
 * words, never a raw driver/SDK error string). Attach raw underlying errors to
 * `cause` for server-side diagnostics.
 */

export class BadRequestError extends Data.TaggedError("BadRequestError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 400 as const;
}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 401 as const;
}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 403 as const;
}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 404 as const;
}

export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 409 as const;
}

export class UnprocessableEntityError extends Data.TaggedError("UnprocessableEntityError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 422 as const;
}

export class BadGatewayError extends Data.TaggedError("BadGatewayError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 502 as const;
}

export class ServiceUnavailableError extends Data.TaggedError("ServiceUnavailableError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 503 as const;
}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 500 as const;
}

export class ExternalFetchError extends Data.TaggedError("ExternalFetchError")<{
  readonly message: string;
  readonly url?: string | undefined;
  readonly upstreamStatus?: number | undefined;
  readonly cause?: unknown;
}> {
  readonly status = 502 as const;
}

export class PdfRenderError extends Data.TaggedError("PdfRenderError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 500 as const;
}

export class AiScoringError extends Data.TaggedError("AiScoringError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 502 as const;
}

export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly status = 500 as const;
}

export type AppError =
  | BadRequestError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | ConflictError
  | UnprocessableEntityError
  | BadGatewayError
  | ServiceUnavailableError
  | DatabaseError
  | ExternalFetchError
  | PdfRenderError
  | AiScoringError
  | ConfigError;

export function isAppError(value: unknown): value is AppError {
  return (
    value instanceof BadRequestError ||
    value instanceof UnauthorizedError ||
    value instanceof ForbiddenError ||
    value instanceof NotFoundError ||
    value instanceof ConflictError ||
    value instanceof UnprocessableEntityError ||
    value instanceof BadGatewayError ||
    value instanceof ServiceUnavailableError ||
    value instanceof DatabaseError ||
    value instanceof ExternalFetchError ||
    value instanceof PdfRenderError ||
    value instanceof AiScoringError ||
    value instanceof ConfigError
  );
}

/**
 * Converts a typed `AppError` into a safe `HttpError` (preserving
 * `markSafeError` for Solid 2 server function RPC boundaries).
 */
export function toHttpError(error: AppError): HttpError {
  return new HttpError(error.status, error.message);
}
