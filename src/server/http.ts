import "server-only";
import { markSafeError } from "@solidjs/web";

/**
 * An error that carries the HTTP status the request should answer with. Its
 * message is written for the desk to show, so it's marked safe: production
 * builds otherwise replace every thrown server function error with a generic
 * "Internal Server Error" (to keep driver errors off the wire). Only throw it
 * with your own words, never with a caught error's message.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    markSafeError(this);
  }
}
