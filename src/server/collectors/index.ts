import "server-only";
import type { PushCollector } from "./types";
import type { PushCollectorType } from "../../data/postings";
import { linkedinEmail } from "./linkedin-email";

// The collectors, by type. A new source is a module here: one the desk is
// sent to reads what it is sent into FoundPostings; one the desk runs itself
// (a company's job board, ats/) fetches them. The desk stores, deduplicates
// and lists them the same for every source.

const PUSH_COLLECTORS: Record<PushCollectorType, PushCollector> = {
  "linkedin-email": linkedinEmail,
};

export { PUSH_COLLECTORS };
export { readUrl, readUrlEffect } from "./url";
export {
  AtsBoardSchema,
  atsBoardSchema,
  decodeAtsBoardEffect,
  decodeAtsBoardOption,
  matchesBoard,
  readBoard,
  readBoardEffect,
  rereadBoardJob,
} from "./ats";
export type { FoundPosting, PushCollector } from "./types";
