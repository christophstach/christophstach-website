import "server-only";
import { Cache, Clock, Duration, Effect, Exit, Schema } from "effect";
import { Output, generateText } from "ai";
import { and, desc, eq, isNotNull, isNull, lt, ne, notInArray, or } from "drizzle-orm";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getRequestEvent } from "@solidjs/web";
import { env } from "virtual:solid-env/server";
import { applications, jobPostings } from "../../server/db/schema";
import type { CompanyRecord } from "../data/companies";
import type { CvContent, TimelineEntry } from "../data/cv";
import type { JobPosting } from "../data/postings";
import { SALARY_SYMBOLS, WORKPLACE_LABELS } from "../data/postings";
import { companiesByKey, companyFacts } from "../lib/company";
import { companyKey } from "../lib/posting";
import { fillAdTextsQuietlyEffect } from "./ad-texts";
import { listCompaniesEffect } from "./companies";
import { loadCvContentEffect } from "./cv-content";
import { listCvsEffect } from "./cvs";
import {
  AiScoringError,
  type ConfigError,
  type Database,
  type DatabaseError,
  ExternalFetchError,
  dbQuery,
  runServerEffect,
} from "./effect";
import { loadJobSearchEffect } from "./job-search";
import { requirePostingEffect } from "./postings";

// Scores how well each posting fits, with a language model on OpenRouter
// (through the Vercel AI SDK): the CV content and the desk's search notes
// against the ad. Only a free model runs: before a run, OpenRouter's public
// price list must show every endpoint of the model at 0. The key is from an
// account without credit, so nothing could be charged even then. Free models
// allow 50 requests a day; the scheduled job takes the rest the next day.

/** A free model on OpenRouter that answers in a JSON schema (NVIDIA's Nemotron 3.5 Super). */
const DEFAULT_MODEL = "nvidia/nemotron-3.5-super-vl:free";

const OPENROUTER = "https://openrouter.ai/api/v1";

/** An ad's text beyond this adds little and slows the model. */
const DESCRIPTION_CHARS = 12_000;

/** One call never runs longer; a reasoning model can take a while. */
const CALL_TIMEOUT_MS = 45_000;

/**
 * A call takes 10–20 s; with less time left before the deadline none starts,
 * since a call cut off still counts against the free model's daily requests.
 */
const MIN_CALL_MS = 25_000;

/** A model's prices are read again after this long. */
const PRICE_CHECK_TTL = "1 hour" as const;

const PRICE_CHECK_TIMEOUT = "10 seconds" as const;

const PRICE_CHECK_CAPACITY = 32;

const endpointsSchema = Schema.Struct({
  data: Schema.Struct({
    endpoints: Schema.Array(
      Schema.Struct({
        pricing: Schema.Record(Schema.String, Schema.Unknown),
      }),
    ),
  }),
});

const decodeEndpoints = Schema.decodeUnknownEffect(endpointsSchema);

/** What the model answers; lenient on purpose, cleaned up in toScore. */
const answerSchema = Schema.Struct({
  score: Schema.Finite,
  reasons: Schema.Array(Schema.String),
  concerns: Schema.Array(Schema.String),
  cvId: Schema.String,
});

type Answer = Schema.Schema.Type<typeof answerSchema>;

const aiAnswerSchema = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(answerSchema));

interface ScoreRun {
  model: string;
  /** Posting ids scored in this run. */
  scored: string[];
  /** Why the run stopped early, or why it didn't run; empty if it didn't. */
  error: string;
  /** Postings still to score, for the next run. */
  left: number;
}

interface Brief {
  readonly context: string;
  readonly cvIds: ReadonlySet<string>;
  readonly companies: ReadonlyMap<string, CompanyRecord>;
  readonly notesAt: string;
}

type ScoreModel = ReturnType<ReturnType<typeof createOpenRouter>["chat"]>;

function scoreModel(): string {
  return env.JOB_SCORE_MODEL ?? DEFAULT_MODEL;
}

function isZero(price: unknown): boolean {
  return (typeof price === "string" || typeof price === "number") && Number(price) === 0;
}

/** Why a run failed, in plain words; the SDK's messages carry terminal colours. */
function failure(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Scoring failed.";
  }

  // oxlint-disable-next-line no-control-regex -- strips ANSI colour codes
  return error.message.replaceAll(/\u001b\[\d+m/gu, "");
}

function checkModelFreeEffect(model: string): Effect.Effect<boolean, ExternalFetchError> {
  const url = `${OPENROUTER}/models/${model}/endpoints`;

  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(url, { signal }),
      catch: (cause) =>
        new ExternalFetchError({
          message: `Could not check OpenRouter pricing for "${model}".`,
          url,
          cause,
        }),
    });

    if (!response.ok) {
      return yield* new ExternalFetchError({
        message: `OpenRouter doesn't list "${model}" (${response.status}).`,
        url,
        upstreamStatus: response.status,
      });
    }

    const body = yield* Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: (cause) =>
        new ExternalFetchError({
          message: `OpenRouter pricing for "${model}" was not valid JSON.`,
          url,
          cause,
        }),
    });
    const parsed = yield* decodeEndpoints(body).pipe(
      Effect.mapError(
        (cause) =>
          new ExternalFetchError({
            message: `OpenRouter pricing for "${model}" had an unexpected shape.`,
            url,
            cause,
          }),
      ),
    );
    const { endpoints } = parsed.data;

    return (
      endpoints.length > 0 &&
      endpoints.every((endpoint) => Object.values(endpoint.pricing).every(isZero))
    );
  }).pipe(
    Effect.timeout(PRICE_CHECK_TIMEOUT),
    Effect.catchTag(
      "TimeoutError",
      (cause) =>
        new ExternalFetchError({
          message: `OpenRouter pricing check for "${model}" timed out.`,
          url,
          cause,
        }),
    ),
  );
}

type FreeCheckCache = Cache.Cache<string, boolean, ExternalFetchError>;

let freeCheckCache: FreeCheckCache | undefined;

function getFreeCheckCacheEffect(): Effect.Effect<FreeCheckCache> {
  return Effect.gen(function* () {
    if (freeCheckCache !== undefined) {
      return freeCheckCache;
    }

    // Only cache successful price checks for 1 hour; failed lookups expire
    // immediately so transient OpenRouter outages aren't sticky.
    const created = yield* Cache.makeWith(checkModelFreeEffect, {
      capacity: PRICE_CHECK_CAPACITY,
      timeToLive: (exit) => (Exit.isSuccess(exit) ? PRICE_CHECK_TTL : Duration.zero),
    });

    freeCheckCache ??= created;

    return freeCheckCache;
  });
}

/**
 * Whether every endpoint OpenRouter may route the model to is free. A model
 * free at one provider and paid at another isn't: OpenRouter may pick either.
 */
function isFreeEffect(model: string): Effect.Effect<boolean, ExternalFetchError> {
  return Effect.flatMap(getFreeCheckCacheEffect(), (cache) => Cache.get(cache, model));
}

function period(entry: TimelineEntry): string {
  return `${entry.from} – ${entry.to ?? "today"}`;
}

function entryText(entry: TimelineEntry): string {
  const lines = [
    `### ${entry.title}, ${entry.organization} (${period(entry)}${entry.location === undefined ? "" : `, ${entry.location}`})`,
    ...(entry.tech === undefined || entry.tech.length === 0
      ? []
      : [`Tech: ${entry.tech.join(", ")}`]),
    ...Object.values(entry.bullets ?? {}).map((bullet) => `- ${bullet}`),
  ];

  return lines.join("\n");
}

/** The CV content as plain text: everything any CV could pick. */
function contentText(content: CvContent): string {
  return [
    `Name: ${content.profile.name}. Role: ${content.profile.role}. Based in ${content.profile.location}.`,
    "## Experience",
    ...content.experience.map(entryText),
    "## Education",
    ...content.education.map(entryText),
    "## Skills",
    ...content.skills.map((group) => `- ${group.title}: ${group.items.join(", ")}`),
    "## Projects",
    ...content.projects.map(
      (project) => `- ${project.title}: ${project.description} (${project.tech.join(", ")})`,
    ),
  ].join("\n");
}

function salaryText(posting: JobPosting): string {
  if (posting.salaryCurrency === "" || (posting.salaryMin === null && posting.salaryMax === null)) {
    return "not stated";
  }

  const symbol = SALARY_SYMBOLS[posting.salaryCurrency];
  const range = [posting.salaryMin, posting.salaryMax]
    .filter((value) => value !== null)
    .map((value) => `${symbol}${value.toLocaleString("en")}`)
    .join(" – ");

  return `${range} a year`;
}

function postingText(posting: JobPosting, company: string): string {
  const description = posting.description.trim();

  return [
    `Title: ${posting.title}`,
    `Company: ${posting.company}${company === "" ? "" : ` (${company})`}`,
    `Location: ${posting.location || "not stated"}`,
    `Workplace: ${posting.workplace === "" ? "not stated" : WORKPLACE_LABELS[posting.workplace]}`,
    `Salary: ${salaryText(posting)}`,
    "",
    description === ""
      ? "The ad's text isn't available: judge by the title, company and location, and keep the score near the middle unless they clearly fit or clearly don't."
      : description.slice(0, DESCRIPTION_CHARS),
  ].join("\n");
}

const INSTRUCTIONS = `You judge how well a job ad fits one person, for their private job search.
You get their CV content (everything they could put on a CV), their own notes on what they look for, the CVs they keep for different kinds of jobs, and the ad.

Score 0–100 how worthwhile it is for them to apply:
- 85–100: a strong match on role, level, stack and their notes; apply first.
- 65–84: a good match with a gap or two.
- 40–64: possible, but a stretch or a poor fit with their notes.
- 0–39: the wrong role, level, place or terms; their notes rule out what the ad states.
Their notes outweigh the CV where they say what they want or don't want.
Judge only what the ad and the CV state. Don't guess facts about the company.

Answer in English:
- reasons: up to 3 short lines (at most 12 words each) on why it fits, the strongest first.
- concerns: up to 3 short lines on what speaks against it; none if nothing does.
- cvId: the id of the CV that suits this job best, exactly as listed; empty if none is listed.`;

/** Up to three non-empty lines. */
function cleanLines(items: readonly string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .slice(0, 3);
}

function toScore(answer: Answer, cvIds: ReadonlySet<string>) {
  return {
    score: Math.min(100, Math.max(0, Math.round(answer.score))),
    reasons: cleanLines(answer.reasons),
    concerns: cleanLines(answer.concerns),
    cvId: cvIds.has(answer.cvId) ? answer.cvId : "",
  };
}

/** What every posting is scored against; read once per run. */
function loadBriefEffect(): Effect.Effect<Brief, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [content, { cvs }, search, companies] = yield* Effect.all(
      [loadCvContentEffect(), listCvsEffect(), loadJobSearchEffect(), listCompaniesEffect()],
      { concurrency: "unbounded" },
    );
    const cvList = cvs
      .map(
        (cv) =>
          `- ${cv.id}: ${cv.label}. ${[cv.role, cv.summary, cv.note].filter(Boolean).join(" ")}`,
      )
      .join("\n");

    return {
      context: [
        "# CV content",
        contentText(content),
        "# What they look for (their own notes)",
        search.notes.trim() || "No notes; judge by the CV.",
        "# Their CVs",
        cvList || "None.",
      ].join("\n\n"),
      cvIds: new Set(cvs.map((cv) => cv.id)),
      companies: companiesByKey(companies),
      notesAt: search.updatedAt,
    };
  });
}

function scoreOneEffect(
  brief: Brief,
  posting: JobPosting,
  model: ScoreModel,
  timeout: number,
): Effect.Effect<void, AiScoringError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const company = brief.companies.get(companyKey(posting.company));
    const { output } = yield* Effect.tryPromise({
      try: (abortSignal) =>
        generateText({
          model,
          instructions: INSTRUCTIONS,
          prompt: `${brief.context}\n\n# The job ad\n\n${postingText(posting, company === undefined ? "" : companyFacts(company))}`,
          output: Output.object({ schema: aiAnswerSchema, name: "fit" }),
          reasoning: "high",
          maxRetries: 1,
          abortSignal,
        }),
      catch: (cause) =>
        new AiScoringError({
          message: failure(cause),
          cause,
        }),
    }).pipe(
      Effect.timeout(Duration.millis(timeout)),
      Effect.catchTag(
        "TimeoutError",
        (cause) =>
          new AiScoringError({
            message: "Scoring timed out.",
            cause,
          }),
      ),
    );
    const score = toScore(output, brief.cvIds);

    yield* dbQuery(
      (db) =>
        db
          .update(jobPostings)
          .set({
            score: score.score,
            scoreReasons: score.reasons,
            scoreConcerns: score.concerns,
            scoreCvId: score.cvId,
            scoreModel: model.modelId,
            scoredAt: new Date(),
          })
          .where(eq(jobPostings.id, posting.id)),
      "Could not save posting score.",
    );
  });
}

/**
 * The postings due for a score, newest first: not dismissed, not applied to,
 * and unscored or scored before the search notes last changed. With ids,
 * those, also if scored.
 */
function dueIdsEffect(
  notesAt: string,
  ids: readonly string[] | undefined,
): Effect.Effect<readonly string[], DatabaseError | ConfigError, Database> {
  if (ids !== undefined) {
    return Effect.succeed(ids);
  }

  return dbQuery(async (db) => {
    const applied = db
      .select({ postingId: applications.postingId })
      .from(applications)
      .where(isNotNull(applications.postingId));
    const stale =
      notesAt === ""
        ? isNull(jobPostings.scoredAt)
        : or(isNull(jobPostings.scoredAt), lt(jobPostings.scoredAt, new Date(notesAt)));
    const rows = await db
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(and(ne(jobPostings.status, "dismissed"), stale, notInArray(jobPostings.id, applied)))
      // Unscored first, then the stale ones; newest first within each.
      .orderBy(
        desc(isNull(jobPostings.scoredAt)),
        desc(jobPostings.createdAt),
        desc(jobPostings.id),
      );

    return rows.map((row) => row.id);
  }, "Could not load postings due for scoring.");
}

/**
 * Scores postings one at a time until the deadline: the ones due, or the
 * given ones. Stops at the first failure: the next would most likely fail
 * the same way (no sign-in, no network, the model gone).
 */
function scorePostingsEffect({
  deadline,
  ids,
}: {
  deadline: number;
  ids?: string[] | undefined;
}): Effect.Effect<ScoreRun, never, Database> {
  return Effect.gen(function* () {
    const model = scoreModel();
    const run: ScoreRun = { model, scored: [], error: "", left: 0 };
    const apiKey = env.OPENROUTER_API_KEY;

    if (apiKey === undefined) {
      return Object.assign(run, {
        error: "Set OPENROUTER_API_KEY: a key from an OpenRouter account without credit.",
      });
    }

    const execute = Effect.gen(function* () {
      const free = yield* isFreeEffect(model);

      if (!free) {
        run.error = `"${model}" isn't free at every provider, so it doesn't run. Set JOB_SCORE_MODEL to a free model.`;

        return;
      }

      const llm = createOpenRouter({ apiKey }).chat(model);
      const brief = yield* loadBriefEffect();
      const due = yield* dueIdsEffect(brief.notesAt, ids);

      run.left = due.length;

      // One at a time on purpose: free models allow 20 requests a minute. A
      // failure ends the loop, so the rest are skipped.
      yield* Effect.forEach(
        due,
        (id) =>
          Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis;
            const remaining = deadline - now;

            if (remaining < MIN_CALL_MS) {
              return;
            }

            const posting = yield* requirePostingEffect(id);

            yield* scoreOneEffect(brief, posting, llm, Math.min(CALL_TIMEOUT_MS, remaining));
            run.scored.push(id);
            run.left -= 1;
          }),
        { concurrency: 1, discard: true },
      );
    });

    yield* execute.pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          run.error = error.message;
        }),
      ),
    );

    return run;
  });
}

/**
 * Scores postings one at a time until the deadline: the ones due, or the
 * given ones. Stops at the first failure: the next would most likely fail
 * the same way (no sign-in, no network, the model gone).
 */
async function scorePostings(options: {
  deadline: number;
  ids?: string[] | undefined;
}): Promise<ScoreRun> {
  return runServerEffect(scorePostingsEffect(options));
}

/** A request on Vercel can keep its function running after the response. */
interface Lingering {
  waitUntil: (promise: Promise<unknown>) => void;
}

function canLinger(request: Request): request is Request & Lingering {
  return "waitUntil" in request && typeof request.waitUntil === "function";
}

/** A function ends after 60 s (maxDuration in vite.config.ts), the time after its response included. */
const FUNCTION_MS = 55_000;

function textThenScoreEffect(
  ids: string[],
  deadline: number,
): Effect.Effect<void, never, Database> {
  return Effect.gen(function* () {
    // The search leaves the score one call's time.
    yield* fillAdTextsQuietlyEffect({ deadline: deadline - MIN_CALL_MS - 5000, ids });
    // scorePostingsEffect never fails: a failure only ends the run.
    yield* scorePostingsEffect({ deadline, ids });
  });
}

/**
 * Scores postings that just came in, so a new posting needn't wait for the
 * scheduled job: first their ad's text from the company's board where they
 * came without one, then the score. Where the platform lets the function run
 * on after the response (Vercel's waitUntil), that happens in the background;
 * elsewhere the caller waits. `started` is when the request began: all of it
 * ends inside the function's time. What doesn't fit the time or the day's
 * requests stays due for the scheduled job.
 */
function scoreSoonEffect(
  ids: string[],
  { started, request }: { started: number; request?: Request | undefined },
): Effect.Effect<void, never, Database> {
  if (ids.length === 0) {
    return Effect.void;
  }

  const deadline = started + FUNCTION_MS;
  const from = request ?? getRequestEvent()?.request;

  if (from !== undefined && canLinger(from)) {
    return Effect.sync(() => {
      from.waitUntil(runServerEffect(textThenScoreEffect(ids, deadline)));
    });
  }

  return textThenScoreEffect(ids, deadline);
}

/**
 * Scores postings that just came in, so a new posting needn't wait for the
 * scheduled job: first their ad's text from the company's board where they
 * came without one, then the score. Where the platform lets the function run
 * on after the response (Vercel's waitUntil), that happens in the background;
 * elsewhere the caller waits. `started` is when the request began: all of it
 * ends inside the function's time. What doesn't fit the time or the day's
 * requests stays due for the scheduled job.
 */
async function scoreSoon(
  ids: string[],
  options: { started: number; request?: Request | undefined },
): Promise<void> {
  return runServerEffect(scoreSoonEffect(ids, options));
}

export {
  isFreeEffect,
  loadBriefEffect,
  scoreModel,
  scoreOneEffect,
  scorePostings,
  scorePostingsEffect,
  scoreSoon,
  scoreSoonEffect,
};
export type { Brief, ScoreModel, ScoreRun };
