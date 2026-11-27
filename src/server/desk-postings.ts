import "server-only";
import { Clock, Effect, Schema } from "effect";
import type { Application } from "../data/applications";
import { COLLECTOR_TYPES, POSTING_STATUSES } from "../data/postings";
import type { CollectorType, PostingEdit } from "../data/postings";
import { slugify } from "../lib/cover-letter";
import { companyKey } from "../lib/posting";
import { applicationIdsEffect, linkPostingEffect, saveApplicationEffect } from "./applications";
import { requireUserEffect } from "./auth";
import {
  createCollectorEffect,
  deleteCollectorEffect,
  renewSecretEffect,
  rereadCollectorEffect,
  runCollectorEffect,
  updateCollectorEffect,
} from "./collector-store";
import type { CollectorRun } from "./collector-store";
import { AtsBoardSchema, readUrlEffect } from "./collectors";
import { checkCompaniesQuietlyEffect } from "./company-check";
import { listCvsEffect } from "./cvs";
import { runServerEffect } from "./effect";
import {
  ISO_DATE_PATTERN,
  decodeBodyEffect,
  emptyOrMatchingSchema,
  requireSlugEffect,
  textSchema,
  trimmedSchema,
} from "./input";
import { loadJobSearchEffect, saveJobSearchEffect } from "./job-search";
import { jobTermsFields, salaryInOrderCheck } from "./job-terms";
import { scoreModel, scorePostingsEffect, scoreSoonEffect } from "./posting-score";
import type { ScoreRun } from "./posting-score";
import {
  addPostingsEffect,
  deletePostingEffect,
  postingId,
  requirePostingEffect,
  savePostingEffect,
  setPostingsStatusEffect,
} from "./postings";

// The desk's posting and collector writes. Each checks the session first and
// parses its input.

const NOT_POSTING = "Not a posting.";

const PostingUrlSchema = textSchema("Paste the job's address.");
const JobSearchNotesSchema = trimmedSchema("Notes are text.");

const EditSchema = Schema.Struct({
  company: trimmedSchema(NOT_POSTING),
  title: trimmedSchema(NOT_POSTING),
  location: trimmedSchema(NOT_POSTING),
  description: trimmedSchema(NOT_POSTING),
  postedOn: emptyOrMatchingSchema(ISO_DATE_PATTERN, NOT_POSTING),
  ...jobTermsFields(NOT_POSTING),
  status: Schema.Literals(POSTING_STATUSES).annotate({ message: NOT_POSTING }),
})
  .annotate({ message: NOT_POSTING })
  .pipe(Schema.check(salaryInOrderCheck));

const StatusSchema = Schema.Struct({
  ids: Schema.mutable(
    Schema.Array(Schema.String.annotate({ message: NOT_POSTING })).annotate({
      message: NOT_POSTING,
    }),
  ),
  status: Schema.Literals(POSTING_STATUSES).annotate({ message: NOT_POSTING }),
}).annotate({ message: NOT_POSTING });

const CollectorSchema = Schema.Struct({
  type: Schema.Literals(COLLECTOR_TYPES).annotate({ message: "Pick a collector type." }),
  label: textSchema("The collector needs a name."),
  board: Schema.optionalKey(AtsBoardSchema),
});

const CollectorChangeSchema = Schema.Struct({
  label: textSchema("The collector needs a name."),
  active: Schema.Boolean.annotate({ message: "Active is yes or no." }),
  board: Schema.optionalKey(AtsBoardSchema),
});

/** Reads the job ad at an address into the inbox; answers its posting's id, also if it was there. */
function addDeskPostingByUrlEffect(url: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const started = yield* Clock.currentTimeMillis;
    const address = yield* decodeBodyEffect(PostingUrlSchema, url);
    const found = yield* readUrlEffect(address);

    // A posting the desk has already keeps its id and status.
    const added = yield* addPostingsEffect([found], null);
    const now = yield* Clock.currentTimeMillis;

    yield* checkCompaniesQuietlyEffect({
      deadline: now + 15_000,
      keys: new Set([companyKey(found.company)]),
      // Its ad may say more now than when the company was last checked.
      force: true,
    });
    yield* scoreSoonEffect(added, { started });

    return postingId(found);
  });
}

/** Reads the job ad at an address into the inbox; answers its posting's id, also if it was there. */
function addDeskPostingByUrl(url: unknown): Promise<string> {
  return runServerEffect(addDeskPostingByUrlEffect(url));
}

function saveDeskPostingEffect(id: string, edit: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const parsed: PostingEdit = yield* decodeBodyEffect(EditSchema, edit);

    yield* savePostingEffect(id, parsed);

    const now = yield* Clock.currentTimeMillis;

    yield* checkCompaniesQuietlyEffect({
      deadline: now + 15_000,
      keys: new Set([companyKey(parsed.company)]),
      // Its ad may say more now than when the company was last checked.
      force: true,
    });

    return parsed;
  });
}

function saveDeskPosting(id: string, edit: unknown): Promise<PostingEdit> {
  return runServerEffect(saveDeskPostingEffect(id, edit));
}

function setDeskPostingsStatusEffect(change: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const { ids, status } = yield* decodeBodyEffect(StatusSchema, change);

    yield* setPostingsStatusEffect(ids, status);
  });
}

function setDeskPostingsStatus(change: unknown): Promise<void> {
  return runServerEffect(setDeskPostingsStatusEffect(change));
}

function deleteDeskPostingEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deletePostingEffect(id);
  });
}

function deleteDeskPosting(id: string): Promise<void> {
  return runServerEffect(deleteDeskPostingEffect(id));
}

/** An application id that is free: the slug, or the slug with a number. */
function freeApplicationIdEffect(slug: string) {
  return Effect.gen(function* () {
    const taken = new Set(yield* applicationIdsEffect());

    for (let number = 1; ; number += 1) {
      const id = number === 1 ? slug : `${slug}-${number}`;

      if (!taken.has(id)) {
        return id;
      }
    }
  });
}

/**
 * Makes an application from a posting, its job fields copied. The link marks
 * the posting as applied to. Answers the application's id.
 */
function applyToDeskPostingEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const posting = yield* requirePostingEffect(id);
    const slug = slugify(`${posting.company} ${posting.title}`) || posting.id;
    const [applicationId, { cvs }] = yield* Effect.all(
      [freeApplicationIdEffect(slug), listCvsEffect()],
      { concurrency: "unbounded" },
    );
    // The CV its score suggests, while that CV still exists.
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

    yield* saveApplicationEffect(application, { create: true });
    yield* linkPostingEffect(applicationId, posting.id);

    return applicationId;
  });
}

/**
 * Makes an application from a posting, its job fields copied. The link marks
 * the posting as applied to. Answers the application's id.
 */
function applyToDeskPosting(id: string): Promise<string> {
  return runServerEffect(applyToDeskPostingEffect(id));
}

/** Scores one posting now, also if it has a score; answers how the run went. */
function scoreDeskPostingEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* requirePostingEffect(id);

    const now = yield* Clock.currentTimeMillis;

    return yield* scorePostingsEffect({ deadline: now + 50_000, ids: [id] });
  });
}

/** Scores one posting now, also if it has a score; answers how the run went. */
function scoreDeskPosting(id: string): Promise<ScoreRun> {
  return runServerEffect(scoreDeskPostingEffect(id));
}

/** Scores the postings due for it, for about a minute; the scheduled job takes the rest. */
function scoreDeskPostingsEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const now = yield* Clock.currentTimeMillis;

    return yield* scorePostingsEffect({ deadline: now + 50_000 });
  });
}

/** Scores the postings due for it, for about a minute; the scheduled job takes the rest. */
function scoreDeskPostings(): Promise<ScoreRun> {
  return runServerEffect(scoreDeskPostingsEffect());
}

/** What the desk looks for, and the model that scores against it. */
function deskJobSearchEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const search = yield* loadJobSearchEffect();

    return { ...search, model: scoreModel() };
  });
}

/** What the desk looks for, and the model that scores against it. */
function deskJobSearch() {
  return runServerEffect(deskJobSearchEffect());
}

function saveDeskJobSearchEffect(notes: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const parsed = yield* decodeBodyEffect(JobSearchNotesSchema, notes);

    yield* saveJobSearchEffect(parsed);
  });
}

function saveDeskJobSearch(notes: unknown): Promise<void> {
  return runServerEffect(saveDeskJobSearchEffect(notes));
}

/** Makes a collector; answers its secret, shown once. */
function createDeskCollectorEffect(id: string, body: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const { type, label, board } = yield* decodeBodyEffect(CollectorSchema, body);
    const slug = yield* requireSlugEffect(id);

    return yield* createCollectorEffect(slug, type satisfies CollectorType, label, board ?? null);
  });
}

/** Makes a collector; answers its secret, shown once. */
function createDeskCollector(id: string, body: unknown): Promise<string> {
  return runServerEffect(createDeskCollectorEffect(id, body));
}

function updateDeskCollectorEffect(id: string, change: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const parsed = yield* decodeBodyEffect(CollectorChangeSchema, change);

    yield* updateCollectorEffect(id, parsed);
  });
}

function updateDeskCollector(id: string, change: unknown): Promise<void> {
  return runServerEffect(updateDeskCollectorEffect(id, change));
}

/** Runs a job board collector now; answers what it found. */
function runDeskCollectorEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* runCollectorEffect(id);
  });
}

/** Runs a job board collector now; answers what it found. */
function runDeskCollector(id: string): Promise<CollectorRun> {
  return runServerEffect(runDeskCollectorEffect(id));
}

function renewDeskCollectorSecretEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* renewSecretEffect(id);
  });
}

function renewDeskCollectorSecret(id: string): Promise<string> {
  return runServerEffect(renewDeskCollectorSecretEffect(id));
}

function deleteDeskCollectorEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deleteCollectorEffect(id);
  });
}

function deleteDeskCollector(id: string): Promise<void> {
  return runServerEffect(deleteDeskCollectorEffect(id));
}

function rereadDeskCollectorEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* rereadCollectorEffect(id);
  });
}

function rereadDeskCollector(id: string): Promise<number> {
  return runServerEffect(rereadDeskCollectorEffect(id));
}

export {
  CollectorChangeSchema,
  CollectorSchema,
  EditSchema,
  StatusSchema,
  addDeskPostingByUrl,
  addDeskPostingByUrlEffect,
  applyToDeskPosting,
  applyToDeskPostingEffect,
  createDeskCollector,
  createDeskCollectorEffect,
  deleteDeskCollector,
  deleteDeskCollectorEffect,
  deleteDeskPosting,
  deleteDeskPostingEffect,
  deskJobSearch,
  deskJobSearchEffect,
  renewDeskCollectorSecret,
  renewDeskCollectorSecretEffect,
  rereadDeskCollector,
  rereadDeskCollectorEffect,
  runDeskCollector,
  runDeskCollectorEffect,
  saveDeskJobSearch,
  saveDeskJobSearchEffect,
  saveDeskPosting,
  saveDeskPostingEffect,
  scoreDeskPosting,
  scoreDeskPostingEffect,
  scoreDeskPostings,
  scoreDeskPostingsEffect,
  setDeskPostingsStatus,
  setDeskPostingsStatusEffect,
  updateDeskCollector,
  updateDeskCollectorEffect,
};
