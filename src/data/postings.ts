/** Where a job ad is posted. */
type PostingSource = "linkedin" | "web";

/** Where a posting stands in the inbox. */
type PostingStatus = "new" | "interesting" | "dismissed" | "applied";

/** What a collector understands; each is a module in src/server/collectors/. */
type CollectorType = "linkedin-email";

/** A job ad in the desk's inbox, private to the desk. */
interface JobPosting {
  /** URL slug, e.g. /desk/postings/linkedin-4012345678. */
  id: string;
  /** The collector that found it; empty if added by hand. */
  collectorId: string;
  source: PostingSource;
  /** The source's id for it: LinkedIn's job id, or the page's URL. */
  externalId: string;
  url: string;
  company: string;
  title: string;
  location: string;
  /** Plain text; empty where the source has none (LinkedIn's mails). */
  description: string;
  /** ISO date; empty if the source doesn't say. */
  postedOn: string;
  status: PostingStatus;
}

/** A posting as the desk lists it. */
interface JobPostingRecord extends JobPosting {
  /** The application created from it; empty if none. */
  applicationId: string;
  /** ISO timestamp of when it was found. */
  createdAt: string;
}

/** What the desk edits of a posting; the rest comes from its source. */
type PostingEdit = Pick<
  JobPosting,
  "company" | "title" | "location" | "description" | "postedOn" | "status"
>;

/** A collector as the desk lists it. Its secret is never read back. */
interface Collector {
  /** URL slug, e.g. /desk/collectors/linkedin-alerts. */
  id: string;
  type: CollectorType;
  label: string;
  active: boolean;
  /** ISO timestamp; empty if nothing was ever sent to it. */
  lastRunAt: string;
  /** Postings in the last run, and how many of them were new. */
  lastFound: number;
  lastAdded: number;
  /** Why the last run failed; empty if it didn't. */
  lastError: string;
  /** How many postings it found, in all. */
  postings: number;
}

const POSTING_STATUSES: readonly PostingStatus[] = ["new", "interesting", "dismissed", "applied"];

const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
  new: "New",
  interesting: "Interesting",
  dismissed: "Dismissed",
  applied: "Applied",
};

const POSTING_SOURCES: readonly PostingSource[] = ["linkedin", "web"];

const POSTING_SOURCE_LABELS: Record<PostingSource, string> = {
  linkedin: "LinkedIn",
  web: "Web",
};

const COLLECTOR_TYPES: readonly CollectorType[] = ["linkedin-email"];

/** How the desk names each collector type, and what it takes. */
const COLLECTOR_TYPE_LABELS: Record<CollectorType, { name: string; hint: string }> = {
  "linkedin-email": {
    name: "LinkedIn job alert mails",
    hint: "A script in Gmail sends LinkedIn's job alert mails here (tools/linkedin-alerts.gs).",
  },
};

export {
  COLLECTOR_TYPES,
  COLLECTOR_TYPE_LABELS,
  POSTING_SOURCES,
  POSTING_SOURCE_LABELS,
  POSTING_STATUSES,
  POSTING_STATUS_LABELS,
};
export type {
  Collector,
  CollectorType,
  JobPosting,
  JobPostingRecord,
  PostingEdit,
  PostingSource,
  PostingStatus,
};
