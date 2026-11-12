import type { ApplicationStatus } from "./applications";

/** The applicant tracking systems whose public job boards a collector reads. */
type AtsProvider = "greenhouse" | "lever" | "ashby" | "personio";

/** Where a job ad is posted: LinkedIn, a page added by URL, or a company's job board. */
type PostingSource = "linkedin" | "web" | AtsProvider;

/** Where a posting stands in the inbox. */
type PostingStatus = "new" | "favourite" | "dismissed";

/** Where the work is done; empty if the ad does not say. */
type Workplace = "remote" | "hybrid" | "onsite";

/** The currencies a salary is kept in (ISO 4217). */
type SalaryCurrency = "EUR" | "USD" | "GBP" | "CHF";

/** Collectors something sends postings to, with their secret. */
type PushCollectorType = "linkedin-email";

/** Collectors the desk runs itself, on a schedule or from "Run now". */
type PullCollectorType = "ats-board";

/** What a collector understands; each is a module in src/server/collectors/. */
type CollectorType = PushCollectorType | PullCollectorType;

/**
 * A company's public job board that an "ats-board" collector watches, and
 * which of its jobs reach the inbox. Filters match words, ignoring case; an
 * empty list lets every job through.
 */
interface AtsBoard {
  provider: AtsProvider;
  /** The board's name at the provider, e.g. "acme" in jobs.lever.co/acme. */
  board: string;
  /** The company's name on its postings; the boards don't all say it. */
  company: string;
  /** A title has one of these, e.g. "engineer", "developer". */
  titleIncludes: string[];
  /** A title has none of these, e.g. "working student". */
  titleExcludes: string[];
  /** A location has one of these, e.g. "Berlin", "Remote"; a remote job matches "remote". */
  locations: string[];
}

/** Where the work is done and what it pays, as postings and applications keep it. */
interface JobTerms {
  workplace: Workplace | "";
  /** The salary range per year, in whole units of its currency; null if not stated. */
  salaryMin: number | null;
  salaryMax: number | null;
  /** Empty if no salary is stated. */
  salaryCurrency: SalaryCurrency | "";
}

/** A job ad in the desk's inbox, private to the desk. */
interface JobPosting extends JobTerms {
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
  /** The application created from it; empty if none. Having one means it was applied to. */
  applicationId: string;
  /** That application's status; empty if there is none. */
  applicationStatus: ApplicationStatus | "";
  /** ISO timestamp of when it was found. */
  createdAt: string;
}

/** What the desk edits of a posting; the rest comes from its source. */
type PostingEdit = Pick<
  JobPosting,
  | "company"
  | "title"
  | "location"
  | "description"
  | "postedOn"
  | "workplace"
  | "salaryMin"
  | "salaryMax"
  | "salaryCurrency"
  | "status"
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
  /** The board an "ats-board" collector watches; null for the others. */
  board: AtsBoard | null;
}

const POSTING_STATUSES: readonly PostingStatus[] = ["new", "favourite", "dismissed"];

const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
  new: "New",
  favourite: "Favourite",
  dismissed: "Dismissed",
};

const ATS_PROVIDERS: readonly AtsProvider[] = ["greenhouse", "lever", "ashby", "personio"];

const ATS_PROVIDER_LABELS: Record<AtsProvider, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  personio: "Personio",
};

const POSTING_SOURCES: readonly PostingSource[] = ["linkedin", "web", ...ATS_PROVIDERS];

const POSTING_SOURCE_LABELS: Record<PostingSource, string> = {
  linkedin: "LinkedIn",
  web: "Web",
  ...ATS_PROVIDER_LABELS,
};

const WORKPLACES: readonly Workplace[] = ["remote", "hybrid", "onsite"];

const WORKPLACE_LABELS: Record<Workplace, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const SALARY_CURRENCIES: readonly SalaryCurrency[] = ["EUR", "USD", "GBP", "CHF"];

const SALARY_SYMBOLS: Record<SalaryCurrency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF ",
};

const PULL_COLLECTOR_TYPES: readonly PullCollectorType[] = ["ats-board"];

const COLLECTOR_TYPES: readonly CollectorType[] = ["linkedin-email", ...PULL_COLLECTOR_TYPES];

/** Whether the desk runs the collector itself, instead of being sent to. */
function isPullCollector(type: CollectorType): type is PullCollectorType {
  return PULL_COLLECTOR_TYPES.some((pull) => pull === type);
}

/** How the desk names each collector type, and what it takes. */
const COLLECTOR_TYPE_LABELS: Record<CollectorType, { name: string; hint: string }> = {
  "linkedin-email": {
    name: "LinkedIn job alert mails",
    hint: "A script in Gmail sends LinkedIn's job alert mails here (tools/linkedin-alerts.gs).",
  },
  "ats-board": {
    name: "Company job board",
    hint: "The desk reads a company's public job board (Greenhouse, Lever, Ashby or Personio) every few hours.",
  },
};

export {
  ATS_PROVIDERS,
  ATS_PROVIDER_LABELS,
  COLLECTOR_TYPES,
  COLLECTOR_TYPE_LABELS,
  PULL_COLLECTOR_TYPES,
  isPullCollector,
  POSTING_SOURCES,
  POSTING_SOURCE_LABELS,
  POSTING_STATUSES,
  POSTING_STATUS_LABELS,
  SALARY_CURRENCIES,
  SALARY_SYMBOLS,
  WORKPLACES,
  WORKPLACE_LABELS,
};
export type {
  AtsBoard,
  AtsProvider,
  Collector,
  CollectorType,
  PullCollectorType,
  PushCollectorType,
  JobPosting,
  JobPostingRecord,
  JobTerms,
  PostingEdit,
  PostingSource,
  PostingStatus,
  SalaryCurrency,
  Workplace,
};
