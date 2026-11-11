/** Where an application stands; the last three end it. */
type ApplicationStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offer"
  | "accepted"
  | "rejected"
  | "withdrawn";

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
interface Application {
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

const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
];

/** The statuses that end an application: nothing is due for them. */
const CLOSED_STATUSES: readonly ApplicationStatus[] = ["accepted", "rejected", "withdrawn"];

const APPLICATION_SOURCES: readonly ApplicationSource[] = [
  "portal",
  "linkedin",
  "recruiter",
  "referral",
  "direct",
  "other",
];

export { APPLICATION_SOURCES, APPLICATION_STATUSES, CLOSED_STATUSES };
export type {
  Application,
  ApplicationContact,
  ApplicationEvent,
  ApplicationSource,
  ApplicationStatus,
};
