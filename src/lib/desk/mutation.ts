import { action } from "solid-js";

/**
 * Wraps a desk write server function in Solid's `action()` so the server
 * function transport sees `actionDepth > 0`, sends `X-Single-Flight`, and
 * delivers folded query revalidation data back to the router.
 */
function deskAction<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return action(function* (...args: Args): Generator<Promise<Result>, Result, Result> {
    return yield fn(...args);
  });
}

export { deskAction };
