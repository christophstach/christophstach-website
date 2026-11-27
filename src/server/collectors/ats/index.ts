import "server-only";
import type { Effect } from "effect";
import { Schema } from "effect";
import { literal, object } from "zod/mini";
import { ATS_PROVIDERS, WORKPLACE_LABELS } from "../../../data/postings";
import type { AtsBoard, AtsProvider } from "../../../data/postings";
import type { AtsReader } from "./types";
import { BOARD_NAME } from "../../../lib/ats-board";
import type { FoundPosting } from "../types";
import {
  type BadRequestError,
  type ExternalFetchError,
  type NotFoundError,
  decodeUnknownEffect,
  runServerEffect,
} from "../../effect";
import {
  matching,
  matchingSchema,
  stringList,
  stringListSchema,
  text,
  textSchema,
} from "../../input";
import { ashby } from "./ashby";
import { mapBoardNotFound } from "./fetch";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import { personio } from "./personio";

// Company job boards: each provider's reader, and the filters a collector
// puts on what its board lists.

const ATS_READERS: Record<AtsProvider, AtsReader> = { greenhouse, lever, ashby, personio };

const NOT_BOARD = "Not a job board.";

/** A board as the desk stores and sends it (Effect v4 Schema). */
const AtsBoardSchema = Schema.Struct({
  provider: Schema.Literals(ATS_PROVIDERS).annotate({ message: "Pick the board's provider." }),
  board: matchingSchema(BOARD_NAME, "The board's name is letters, digits, dots and hyphens."),
  company: textSchema("The board needs the company's name."),
  titleIncludes: stringListSchema(NOT_BOARD),
  titleExcludes: stringListSchema(NOT_BOARD),
  locations: stringListSchema(NOT_BOARD),
}).annotate({ message: NOT_BOARD });

const decodeAtsBoardOption = Schema.decodeUnknownOption(AtsBoardSchema);

function decodeAtsBoardEffect(value: unknown): Effect.Effect<AtsBoard, BadRequestError> {
  return decodeUnknownEffect(AtsBoardSchema, value);
}

/**
 * Temporary W4/W5 compat until `collector-store.ts` and `desk-postings.ts`
 * migrate to `AtsBoardSchema`. Remove in W6.
 */
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

/** Every job the board lists (Effect). */
function readBoardEffect(
  board: AtsBoard,
): Effect.Effect<FoundPosting[], ExternalFetchError | NotFoundError> {
  return mapBoardNotFound(ATS_READERS[board.provider].readEffect(board));
}

/** Every job the board lists. */
async function readBoard(board: AtsBoard): Promise<FoundPosting[]> {
  return runServerEffect(readBoardEffect(board));
}

/** One job again from its stored raw input. */
function rereadBoardJob(raw: string, board: AtsBoard): FoundPosting | undefined {
  return ATS_READERS[board.provider].reread(raw, board);
}

export {
  AtsBoardSchema,
  atsBoardSchema,
  decodeAtsBoardEffect,
  decodeAtsBoardOption,
  matchesBoard,
  readBoard,
  readBoardEffect,
  rereadBoardJob,
};
