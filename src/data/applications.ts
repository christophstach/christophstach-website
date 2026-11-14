import type { JobTerms } from "./postings";

/**
 * Whether an application went out. Only that is tracked: what happened after
 * (calls, interviews, a no) goes into its history, if anywhere.
 */
type ApplicationStatus = "preparing" | "applied";

/** How the application reached the company. */
type ApplicationSource = "portal" | "linkedin" | "recruiter" | "referral" | "direct" | "other";

/** A person at the company or a recruiter, kept with the application. */
interface ApplicationContact {
  /** Stable within the application: keys the desk's list. */
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

/** One step of the history: a call, an interview, a reply. */
interface ApplicationEvent {
  /** Stable within the application: keys the desk's list. */
  id: string;
  /** ISO date, e.g. "2026-11-02". */
  date: string;
  text: string;
}

/** One job applied for, or about to be, private to the desk. */
interface Application extends JobTerms {
  /** URL slug, e.g. /desk/applications/acme-frontend. */
  id: string;
  company: string;
  jobTitle: string;
  jobUrl: string;
  /** The ad, kept to write against, also after it goes offline. */
  jobDescription: string;
  /** Where the job is: a city, remote or hybrid. */
  location: string;
  source: ApplicationSource;
  status: ApplicationStatus;
  /** The CV sent with it; empty if none. */
  cvId: string;
  /** ISO date; empty until it is sent. */
  appliedOn: string;
  /** What to do next, and by when (ISO date); both may be empty. */
  nextStep: string;
  nextStepOn: string;
  contacts: ApplicationContact[];
  /** Oldest first. */
  events: ApplicationEvent[];
  note: string;
}

/** What the desk shows of what an application sent (the frozen copy itself is SentCopy). */
interface SentSummary {
  /** ISO timestamp; empty when the copy no longer fits what the desk renders. */
  sentAt: string;
  hasCv: boolean;
  letters: { id: string; label: string }[];
}

/** An application as the desk lists it, with its letter. */
interface ApplicationRecord extends Application {
  /** Its cover letter, at most one; null if it has none. */
  letter: { id: string; label: string } | null;
  /** The posting it was made from; empty if none. */
  postingId: string;
  /** What it sent; null until it was marked as sent. */
  sent: SentSummary | null;
  /** ISO timestamp of the last save. */
  updatedAt: string;
}

const APPLICATION_STATUSES: readonly ApplicationStatus[] = ["preparing", "applied"];

const APPLICATION_SOURCES: readonly ApplicationSource[] = [
  "portal",
  "linkedin",
  "recruiter",
  "referral",
  "direct",
  "other",
];

/** How the desk names each status. */
const STATUS_LABELS: Record<ApplicationStatus, string> = {
  preparing: "Preparing",
  applied: "Applied",
};

/** How the desk names each source. */
const SOURCE_LABELS: Record<ApplicationSource, string> = {
  portal: "Job portal",
  linkedin: "LinkedIn",
  recruiter: "Recruiter",
  referral: "Referral",
  direct: "Direct",
  other: "Other",
};

export { APPLICATION_SOURCES, APPLICATION_STATUSES, SOURCE_LABELS, STATUS_LABELS };
export type {
  Application,
  ApplicationRecord,
  ApplicationContact,
  ApplicationEvent,
  ApplicationSource,
  ApplicationStatus,
  SentSummary,
};
