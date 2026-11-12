import "server-only";
import type { CollectorType } from "../../data/postings";
import type { PushCollector } from "./types";
import { linkedinEmail } from "./linkedin-email";

// The collectors the desk can be sent to, by type. A new source is a module
// here: it reads what it is sent into FoundPostings, and the desk stores,
// deduplicates and lists them the same for every source.

const PUSH_COLLECTORS: Record<CollectorType, PushCollector> = {
  "linkedin-email": linkedinEmail,
};

export { PUSH_COLLECTORS };
export { readUrl } from "./url";
export type { FoundPosting, PushCollector } from "./types";
