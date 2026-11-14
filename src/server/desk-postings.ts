import "server-only";
import { checkCompaniesQuietly } from "./company-check";
import { COLLECTOR_TYPES, POSTING_STATUSES } from "../data/postings";
import { jobTermsShape, salaryInOrder } from "./job-terms";
import type { CollectorType, PostingEdit } from "../data/postings";
import {
  addPostings,
  deletePosting,
  postingId,
  requirePosting,
  savePosting,
  setPostingsStatus,
} from "./postings";
import { array, boolean, exactOptional, literal, object, string } from "zod/mini";
import {
  createCollector,
  deleteCollector,
  renewSecret,
  rereadCollector,
  runCollector,
  updateCollector,
} from "./collector-store";
import { atsBoardSchema, readUrl } from "./collectors";
import type { CollectorRun } from "./collector-store";
import { emptyOrMatching, parseInput, requireSlug, text, trimmed } from "./input";
import { applicationIds, linkPosting, saveApplication } from "./applications";
import type { Application } from "../data/applications";
import { requireUser } from "./auth";
import { companyKey } from "../lib/posting";
import { slugify } from "../lib/cover-letter";
import { loadJobSearch, saveJobSearch } from "./job-search";
import { scoreModel, scorePostings, scoreSoon } from "./posting-score";
import type { ScoreRun } from "./posting-score";
import { listCvs } from "./cvs";

// The desk's posting and collector writes. Each checks the session first and
// parses its input.

const NOT_POSTING = "Not a posting.";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

const editSchema = object(
  {
    company: trimmed(NOT_POSTING),
    title: trimmed(NOT_POSTING),
    location: trimmed(NOT_POSTING),
    description: trimmed(NOT_POSTING),
    postedOn: emptyOrMatching(ISO_DATE, NOT_POSTING),
    ...jobTermsShape(NOT_POSTING),
    status: literal(POSTING_STATUSES, NOT_POSTING),
  },
  NOT_POSTING,
).check(salaryInOrder);

const statusSchema = object({
  ids: array(string(NOT_POSTING), NOT_POSTING),
  status: literal(POSTING_STATUSES, NOT_POSTING),
});

const collectorSchema = object({
  type: literal(COLLECTOR_TYPES, "Pick a collector type."),
  label: text("The collector needs a name."),
  board: exactOptional(atsBoardSchema),
});

const collectorChangeSchema = object({
  label: text("The collector needs a name."),
  active: boolean("Active is yes or no."),
  board: exactOptional(atsBoardSchema),
});

/** Reads the job ad at an address into the inbox; answers its posting's id, also if it was there. */
async function addDeskPostingByUrl(url: unknown): Promise<string> {
  await requireUser();

  const found = await readUrl(parseInput(text("Paste the job's address."), url));

  // A posting the desk has already keeps its id and status.
  const added = await addPostings([found], null);

  await checkCompaniesQuietly({
    deadline: Date.now() + 15_000,
    keys: new Set([companyKey(found.company)]),
    // Its ad may say more now than when the company was last checked.
    force: true,
  });
  await scoreSoon(added);

  return postingId(found);
}

async function saveDeskPosting(id: string, edit: unknown): Promise<PostingEdit> {
  await requireUser();

  const parsed = parseInput(editSchema, edit);

  await savePosting(id, parsed);
  await checkCompaniesQuietly({
    deadline: Date.now() + 15_000,
    keys: new Set([companyKey(parsed.company)]),
    // Its ad may say more now than when the company was last checked.
    force: true,
  });

  return parsed;
}

async function setDeskPostingsStatus(change: unknown) {
  await requireUser();

  const { ids, status } = parseInput(statusSchema, change);

  await setPostingsStatus(ids, status);
}

async function deleteDeskPosting(id: string) {
  await requireUser();
  await deletePosting(id);
}

/** An application id that is free: the slug, or the slug with a number. */
async function freeApplicationId(slug: string): Promise<string> {
  const taken = new Set(await applicationIds());

  for (let number = 1; ; number += 1) {
    const id = number === 1 ? slug : `${slug}-${number}`;

    if (!taken.has(id)) {
      return id;
    }
  }
}

/**
 * Makes an application from a posting, its job fields copied. The link marks
 * the posting as applied to. Answers the application's id.
 */
async function applyToDeskPosting(id: string): Promise<string> {
  await requireUser();

  const posting = await requirePosting(id);
  const slug = slugify(`${posting.company} ${posting.title}`) || posting.id;
  const applicationId = await freeApplicationId(slug);
  // The CV its score suggests, while that CV still exists.
  const { cvs } = await listCvs();
  const cvId = cvs.some((cv) => cv.id === posting.score?.cvId) ? (posting.score?.cvId ?? "") : "";
  const application: Application = {
    id: applicationId,
    company: posting.company || "Unknown company",
    jobTitle: posting.title,
    jobUrl: posting.url,
    jobDescription: posting.description,
    location: posting.location,
    workplace: posting.workplace,
    salaryMin: posting.salaryMin,
    salaryMax: posting.salaryMax,
    salaryCurrency: posting.salaryCurrency,
    source: posting.source === "linkedin" ? "linkedin" : "direct",
    status: "preparing",
    cvId,
    appliedOn: "",
    nextStep: "",
    nextStepOn: "",
    contacts: [],
    events: [],
    note: "",
  };

  await saveApplication(application, { create: true });
  await linkPosting(applicationId, posting.id);

  return applicationId;
}

/** Scores one posting now, also if it has a score; answers how the run went. */
async function scoreDeskPosting(id: string): Promise<ScoreRun> {
  await requireUser();
  await requirePosting(id);

  return scorePostings({ deadline: Date.now() + 50_000, ids: [id] });
}

/** Scores the postings due for it, for about a minute; the scheduled job takes the rest. */
async function scoreDeskPostings(): Promise<ScoreRun> {
  await requireUser();

  return scorePostings({ deadline: Date.now() + 50_000 });
}

/** What the desk looks for, and the model that scores against it. */
async function deskJobSearch() {
  await requireUser();

  return { ...(await loadJobSearch()), model: scoreModel() };
}

async function saveDeskJobSearch(notes: unknown) {
  await requireUser();
  await saveJobSearch(parseInput(string("Notes are text."), notes).trim());
}

/** Makes a collector; answers its secret, shown once. */
async function createDeskCollector(id: string, body: unknown): Promise<string> {
  await requireUser();

  const { type, label, board } = parseInput(collectorSchema, body);

  return createCollector(requireSlug(id), type satisfies CollectorType, label, board ?? null);
}

async function updateDeskCollector(id: string, change: unknown) {
  await requireUser();
  await updateCollector(id, parseInput(collectorChangeSchema, change));
}

/** Runs a job board collector now; answers what it found. */
async function runDeskCollector(id: string): Promise<CollectorRun> {
  await requireUser();

  return runCollector(id);
}

async function renewDeskCollectorSecret(id: string): Promise<string> {
  await requireUser();

  return renewSecret(id);
}

async function deleteDeskCollector(id: string) {
  await requireUser();
  await deleteCollector(id);
}

async function rereadDeskCollector(id: string): Promise<number> {
  await requireUser();

  return rereadCollector(id);
}

export {
  addDeskPostingByUrl,
  applyToDeskPosting,
  createDeskCollector,
  deleteDeskCollector,
  deleteDeskPosting,
  deskJobSearch,
  renewDeskCollectorSecret,
  rereadDeskCollector,
  runDeskCollector,
  saveDeskJobSearch,
  saveDeskPosting,
  scoreDeskPosting,
  scoreDeskPostings,
  setDeskPostingsStatus,
  updateDeskCollector,
};
