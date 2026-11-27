import "server-only";
import { Effect } from "effect";
import type { AtsBoard } from "../../../data/postings";
import { ExternalFetchError, NotFoundError, runServerEffect } from "../../effect";

// Fetching a job board: the boards answer public JSON or XML, without a key.

const MAX_BYTES = 20_000_000;
const BOARD_FETCH_TIMEOUT = "15 seconds" as const;

type BoardAddress = Pick<AtsBoard, "provider" | "board">;

/** Maps a 404 `ExternalFetchError` from a board fetch into a `NotFoundError`. */
function mapBoardNotFound<A>(
  effect: Effect.Effect<A, ExternalFetchError>,
): Effect.Effect<A, ExternalFetchError | NotFoundError> {
  return effect.pipe(
    Effect.catchIf(
      (error) => error.upstreamStatus === 404,
      (error) => new NotFoundError({ message: error.message, cause: error }),
    ),
  );
}

/**
 * The board's answer as text; fails with `ExternalFetchError` carrying
 * `upstreamStatus: 404` and `url` if the provider has no such board.
 */
function fetchBoardEffect(
  url: string,
  { provider, board }: BoardAddress,
): Effect.Effect<string, ExternalFetchError> {
  const { host } = new URL(url);

  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; desk)" },
          redirect: "follow",
          signal,
        }),
      catch: (cause) =>
        new ExternalFetchError({
          message: `${host} did not answer.`,
          url,
          cause,
        }),
    });

    if (response.status === 404) {
      return yield* new ExternalFetchError({
        message: `${provider} has no board "${board}".`,
        url,
        upstreamStatus: 404,
      });
    }

    if (!response.ok) {
      return yield* new ExternalFetchError({
        message: `${host} answered ${response.status}.`,
        url,
        upstreamStatus: response.status,
      });
    }

    const body = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (cause) =>
        new ExternalFetchError({
          message: `${host} did not answer.`,
          url,
          cause,
        }),
    });

    if (body.length > MAX_BYTES) {
      return yield* new ExternalFetchError({
        message: `The board at ${host} is too large to read.`,
        url,
      });
    }

    return body;
  }).pipe(
    Effect.timeout(BOARD_FETCH_TIMEOUT),
    Effect.catchTag(
      "TimeoutError",
      (cause) =>
        new ExternalFetchError({
          message: `${host} did not answer.`,
          url,
          cause,
        }),
    ),
  );
}

/** The board's answer as JSON. */
function fetchBoardJsonEffect(
  url: string,
  address: BoardAddress,
): Effect.Effect<unknown, ExternalFetchError> {
  return Effect.gen(function* () {
    const body = yield* fetchBoardEffect(url, address);

    return yield* Effect.try({
      try: (): unknown => JSON.parse(body),
      catch: (cause) =>
        new ExternalFetchError({
          message: `${address.provider} answered no JSON for "${address.board}".`,
          url,
          cause,
        }),
    });
  });
}

/** The board's answer as text; a 404 if the provider has no such board. */
async function fetchBoard(url: string, address: BoardAddress): Promise<string> {
  return runServerEffect(mapBoardNotFound(fetchBoardEffect(url, address)));
}

/** The board's answer as JSON. */
async function fetchBoardJson(url: string, address: BoardAddress): Promise<unknown> {
  return runServerEffect(mapBoardNotFound(fetchBoardJsonEffect(url, address)));
}

export { fetchBoard, fetchBoardEffect, fetchBoardJson, fetchBoardJsonEffect, mapBoardNotFound };
