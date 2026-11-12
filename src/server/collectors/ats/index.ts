import "server-only";
import { ATS_PROVIDERS, WORKPLACE_LABELS } from "../../../data/postings";
import type { AtsBoard, AtsProvider } from "../../../data/postings";
import { literal, object } from "zod/mini";
import type { AtsReader } from "./types";
import { BOARD_NAME } from "../../../lib/ats-board";
import type { FoundPosting } from "../types";
import { ashby } from "./ashby";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import { matching, stringList, text } from "../../input";
import { personio } from "./personio";

// Company job boards: each provider's reader, and the filters a collector
// puts on what its board lists.

const ATS_READERS: Record<AtsProvider, AtsReader> = { greenhouse, lever, ashby, personio };

const NOT_BOARD = "Not a job board.";

/** A board as the desk stores and sends it. */
const atsBoardSchema = object(
  {
    provider: literal(ATS_PROVIDERS, "Pick the board's provider."),
    board: matching(BOARD_NAME, "The board's name is letters, digits, dots and hyphens."),
    company: text("The board needs the company's name."),
    titleIncludes: stringList(NOT_BOARD),
    titleExcludes: stringList(NOT_BOARD),
    locations: stringList(NOT_BOARD),
  },
  NOT_BOARD,
);

/** Whether a text has one of the words, ignoring case. */
function hasAny(value: string, words: string[]): boolean {
  const lower = value.toLowerCase();

  return words.some((word) => lower.includes(word.toLowerCase()));
}

/** Whether a job passes the collector's filters; an empty list lets every job through. */
function matchesBoard(posting: FoundPosting, board: AtsBoard): boolean {
  // A remote job matches "remote" even where its location doesn't say so.
  const place = `${posting.location} ${posting.workplace === "" ? "" : WORKPLACE_LABELS[posting.workplace]}`;

  return (
    (board.titleIncludes.length === 0 || hasAny(posting.title, board.titleIncludes)) &&
    !hasAny(posting.title, board.titleExcludes) &&
    (board.locations.length === 0 || hasAny(place, board.locations))
  );
}

/** Every job the board lists. */
async function readBoard(board: AtsBoard): Promise<FoundPosting[]> {
  return ATS_READERS[board.provider].read(board);
}

/** One job again from its stored raw input. */
function rereadBoardJob(raw: string, board: AtsBoard): FoundPosting | undefined {
  return ATS_READERS[board.provider].reread(raw, board);
}

export { atsBoardSchema, matchesBoard, readBoard, rereadBoardJob };
