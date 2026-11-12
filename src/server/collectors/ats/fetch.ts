import "server-only";
import type { AtsBoard } from "../../../data/postings";
import { HttpError } from "../../http";

// Fetching a job board: the boards answer public JSON or XML, without a key.

const MAX_BYTES = 20_000_000;

type BoardAddress = Pick<AtsBoard, "provider" | "board">;

/** The board's answer as text; a 404 if the provider has no such board. */
async function fetchBoard(url: string, { provider, board }: BoardAddress): Promise<string> {
  const { host } = new URL(url);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; desk)" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, `${host} did not answer.`);
  }

  if (response.status === 404) {
    throw new HttpError(404, `${provider} has no board "${board}".`);
  }

  if (!response.ok) {
    throw new HttpError(502, `${host} answered ${response.status}.`);
  }

  const body = await response.text();

  if (body.length > MAX_BYTES) {
    throw new HttpError(502, `The board at ${host} is too large to read.`);
  }

  return body;
}

/** The board's answer as JSON. */
async function fetchBoardJson(url: string, address: BoardAddress): Promise<unknown> {
  const body = await fetchBoard(url, address);

  try {
    const parsed: unknown = JSON.parse(body);

    return parsed;
  } catch {
    throw new HttpError(502, `${address.provider} answered no JSON for "${address.board}".`);
  }
}

export { fetchBoard, fetchBoardJson };
