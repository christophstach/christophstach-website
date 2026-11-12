import "server-only";
import type { CollectorType, PostingSource } from "../../data/postings";

/** A job ad as a collector reads it, before it is stored. */
interface FoundPosting {
  source: PostingSource;
  /** The source's id for it; with the source, it says whether the desk has it already. */
  externalId: string;
  url: string;
  company: string;
  title: string;
  location: string;
  description: string;
  /** ISO date or empty. */
  postedOn: string;
  /** What it was read from, so a better reader can read it again. */
  raw: string;
}

/**
 * A collector the desk is sent to (push): it reads a request body into
 * postings. Throws an HttpError (400) for a body it doesn't understand.
 */
interface PushCollector {
  type: CollectorType;
  read: (body: unknown) => FoundPosting[];
  /** Reads one posting's stored raw input again; undefined if it no longer finds it there. */
  reread: (raw: string, externalId: string) => FoundPosting | undefined;
}

export type { FoundPosting, PushCollector };
