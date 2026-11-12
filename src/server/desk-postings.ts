import "server-only";
import { COLLECTOR_TYPES, POSTING_STATUSES, SALARY_CURRENCIES, WORKPLACES } from "../data/postings";
import type { CollectorType, PostingEdit, PostingStatus } from "../data/postings";
import {
  addPostings,
  deletePosting,
  postingId,
  requirePosting,
  savePosting,
  setPostingsStatus,
} from "./postings";
import {
  array,
  boolean,
  int,
  literal,
  maximum,
  minimum,
  nullable,
  object,
  refine,
  string,
} from "zod/mini";
import {
  createCollector,
  deleteCollector,
  renewSecret,
  rereadCollector,
  updateCollector,
} from "./collector-store";
import { emptyOrMatching, parseInput, requireSlug, text, trimmed } from "./input";
import { applicationIds, linkPosting, saveApplication } from "./applications";
import type { Application } from "../data/applications";
import { readUrl } from "./collectors";
import { requireUser } from "./auth";
import { slugify } from "../lib/cover-letter";

// The desk's posting and collector writes. Each checks the session first and
// parses its input.

const NOT_POSTING = "Not a posting.";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

/** A yearly salary, in whole units of its currency. */
const salary = int("A salary is a whole number.").check(
  minimum(0, "A salary isn't negative."),
  maximum(100_000_000, "That salary is too large."),
);

const editSchema = object(
  {
    company: trimmed(NOT_POSTING),
    title: trimmed(NOT_POSTING),
    location: trimmed(NOT_POSTING),
    description: trimmed(NOT_POSTING),
    postedOn: emptyOrMatching(ISO_DATE, NOT_POSTING),
    workplace: literal(["", ...WORKPLACES], NOT_POSTING),
    salaryMin: nullable(salary),
    salaryMax: nullable(salary),
    salaryCurrency: literal(["", ...SALARY_CURRENCIES], NOT_POSTING),
    status: literal(POSTING_STATUSES, NOT_POSTING),
  },
  NOT_POSTING,
).check(
  refine(
    (edit) =>
      edit.salaryMin === null || edit.salaryMax === null || edit.salaryMin <= edit.salaryMax,
    "The salary's lower end is above its upper one.",
  ),
);

const statusSchema = object({
  ids: array(string(NOT_POSTING), NOT_POSTING),
  status: literal(POSTING_STATUSES, NOT_POSTING),
});

const collectorSchema = object({
  type: literal(COLLECTOR_TYPES, "Pick a collector type."),
  label: text("The collector needs a name."),
});

const collectorChangeSchema = object({
  label: text("The collector needs a name."),
  active: boolean("Active is yes or no."),
});

/** Reads the job ad at an address into the inbox; answers its posting's id, also if it was there. */
async function addDeskPostingByUrl(url: unknown): Promise<string> {
  await requireUser();

  const found = await readUrl(parseInput(text("Paste the job's address."), url));

  // A posting the desk has already keeps its id and status.
  await addPostings([found], null);

  return postingId(found);
}

async function saveDeskPosting(id: string, edit: unknown): Promise<PostingEdit> {
  await requireUser();

  const parsed = parseInput(editSchema, edit);

  await savePosting(id, parsed);

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
 * Makes an application from a posting: its job fields copied, the posting
 * marked "applied". Answers the application's id.
 */
async function applyToDeskPosting(id: string): Promise<string> {
  await requireUser();

  const posting = await requirePosting(id);
  const slug = slugify(`${posting.company} ${posting.title}`) || posting.id;
  const applicationId = await freeApplicationId(slug);
  const application: Application = {
    id: applicationId,
    company: posting.company || "Unknown company",
    jobTitle: posting.title,
    jobUrl: posting.url,
    jobDescription: posting.description,
    location: posting.location,
    source: posting.source === "linkedin" ? "linkedin" : "direct",
    status: "saved",
    cvId: "",
    appliedOn: "",
    nextStep: "",
    nextStepOn: "",
    contacts: [],
    events: [],
    note: "",
  };

  await saveApplication(application, { create: true });
  await linkPosting(applicationId, posting.id);
  await setPostingsStatus([posting.id], "applied" satisfies PostingStatus);

  return applicationId;
}

/** Makes a collector; answers its secret, shown once. */
async function createDeskCollector(id: string, body: unknown): Promise<string> {
  await requireUser();

  const { type, label } = parseInput(collectorSchema, body);

  return createCollector(requireSlug(id), type satisfies CollectorType, label);
}

async function updateDeskCollector(id: string, change: unknown) {
  await requireUser();
  await updateCollector(id, parseInput(collectorChangeSchema, change));
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
  renewDeskCollectorSecret,
  rereadDeskCollector,
  saveDeskPosting,
  setDeskPostingsStatus,
  updateDeskCollector,
};
