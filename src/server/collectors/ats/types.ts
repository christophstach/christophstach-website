import "server-only";
import type { AtsBoard, AtsProvider, Workplace } from "../../../data/postings";
import type { FoundPosting } from "../types";
import { NO_SALARY } from "../salary";

/**
 * Reads one provider's public job board. A board lists every open job: the
 * filters of the collector come after, and a job missing from the list is
 * closed.
 */
interface AtsReader {
  provider: AtsProvider;
  /** Every job the board lists. Throws an HttpError if it can't be read. */
  read: (board: AtsBoard) => Promise<FoundPosting[]>;
  /** One job again from its stored raw input; undefined if that no longer reads. */
  reread: (raw: string, board: AtsBoard) => FoundPosting | undefined;
}

/** The fields every job of a board shares, and the board's own id for the job. */
function boardPosting(board: AtsBoard, jobId: string): FoundPosting {
  return {
    source: board.provider,
    // Unique per board: two boards of a provider may reuse an id.
    externalId: `${board.board}:${jobId}`,
    url: "",
    company: board.company,
    title: "",
    location: "",
    description: "",
    postedOn: "",
    workplace: "",
    ...NO_SALARY,
    raw: "",
  };
}

/** The day of an ISO timestamp, or of epoch milliseconds; empty if neither. */
function isoDay(value: string | number | undefined): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? new Date(value).toISOString().slice(0, 10) : "";
  }

  return /^\d{4}-\d{2}-\d{2}/u.exec(value ?? "")?.[0] ?? "";
}

/** A workplace a board writes as a word: "Remote", "OnSite", "on-site", "hybrid". */
function workplaceWord(word: string | undefined): Workplace | "" {
  const normalized = (word ?? "").toLowerCase().replaceAll(/[\s_-]/gu, "");

  if (normalized === "remote") {
    return "remote";
  }

  if (normalized === "hybrid") {
    return "hybrid";
  }

  return normalized === "onsite" || normalized === "inoffice" ? "onsite" : "";
}

/** A workplace a location names, e.g. "Remote, Germany" or "Berlin (Hybrid)"; empty if none. */
function workplaceInLocation(location: string): Workplace | "" {
  if (/\bremote\b/iu.test(location)) {
    return "remote";
  }

  return /\bhybrid\b/iu.test(location) ? "hybrid" : "";
}

/** Places, without repeats or blanks, joined as the desk shows several. */
function joinPlaces(places: (string | undefined)[]): string {
  return [...new Set(places.map((place) => (place ?? "").trim()))]
    .filter((place) => place !== "")
    .join(" · ");
}

export { boardPosting, isoDay, joinPlaces, workplaceInLocation, workplaceWord };
export type { AtsReader };
