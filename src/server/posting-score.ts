import "server-only";
import { Output, generateText } from "ai";
import { and, desc, eq, isNotNull, isNull, lt, ne, notInArray, or } from "drizzle-orm";
import { array, number, object, record, string, unknown } from "zod/mini";
import { applications, jobPostings } from "../../server/db/schema";
import { companiesByKey, companyFacts } from "../lib/company";
import type { CvContent, TimelineEntry } from "../data/cv";
import type { JobPosting } from "../data/postings";
import { SALARY_SYMBOLS, WORKPLACE_LABELS } from "../data/postings";
import { companyKey } from "../lib/posting";
import { env } from "virtual:solid-env/server";
import { listCompanies } from "./companies";
import { listCvs } from "./cvs";
import { loadCvContent } from "./cv-content";
import { loadJobSearch } from "./job-search";
import { requirePosting } from "./postings";
import { useDb } from "./db";

// Scores how well each posting fits, with a language model through the
// Vercel AI Gateway: the CV content and the desk's search notes against the
// ad. Only a free model runs: before a run, the Gateway's public price list
// must show every endpoint of the model at 0, so no call can cost anything.
// On Vercel the Gateway signs in with the deployment's OIDC token; locally,
// `vercel env pull` writes one into .env. Without it a run fails and says so.

/** The most accurate model the Gateway serves for free (Reflection's Beam 1.0). */
const DEFAULT_MODEL = "reflection/beam-free";

const GATEWAY = "https://ai-gateway.vercel.sh/v1";

/** An ad's text beyond this adds little and slows the model. */
const DESCRIPTION_CHARS = 12_000;

/** One call never runs longer; a reasoning model can take a while. */
const CALL_TIMEOUT_MS = 45_000;

/** A model's prices are read again after this long. */
const PRICE_CHECK_MS = 60 * 60 * 1000;

const endpointsSchema = object({
  data: object({
    endpoints: array(object({ pricing: record(string(), unknown()) })),
  }),
});

/** What the model answers; lenient on purpose, cleaned up in toScore. */
const answerSchema = object({
  score: number(),
  reasons: array(string()),
  concerns: array(string()),
  cvId: string(),
});

interface ScoreRun {
  model: string;
  /** Posting ids scored in this run. */
  scored: string[];
  /** Why the run stopped early, or why it didn't run; empty if it didn't. */
  error: string;
  /** Postings still to score, for the next run. */
  left: number;
}

function scoreModel(): string {
  return env.JOB_SCORE_MODEL ?? DEFAULT_MODEL;
}

const freeChecks = new Map<string, { free: boolean; at: number }>();

function isZero(price: unknown): boolean {
  return (typeof price === "string" || typeof price === "number") && Number(price) === 0;
}

/**
 * Whether every endpoint the Gateway may route the model to is free. A model
 * free at one provider and paid at another isn't: the Gateway may pick either.
 */
async function isFree(model: string): Promise<boolean> {
  const known = freeChecks.get(model);

  if (known !== undefined && Date.now() - known.at < PRICE_CHECK_MS) {
    return known.free;
  }

  const response = await fetch(`${GATEWAY}/models/${model}/endpoints`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`The AI Gateway doesn't list "${model}" (${response.status}).`);
  }

  const { endpoints } = endpointsSchema.parse(await response.json()).data;
  const free =
    endpoints.length > 0 &&
    endpoints.every((endpoint) => Object.values(endpoint.pricing).every(isZero));

  freeChecks.set(model, { free, at: Date.now() });

  return free;
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
function cleanLines(items: string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .slice(0, 3);
}

function toScore(answer: unknown, cvIds: ReadonlySet<string>) {
  const parsed = answerSchema.parse(answer);

  return {
    score: Math.min(100, Math.max(0, Math.round(parsed.score))),
    reasons: cleanLines(parsed.reasons),
    concerns: cleanLines(parsed.concerns),
    cvId: cvIds.has(parsed.cvId) ? parsed.cvId : "",
  };
}

/** What every posting is scored against; read once per run. */
async function loadBrief() {
  const [content, { cvs }, search, companies] = await Promise.all([
    loadCvContent(),
    listCvs(),
    loadJobSearch(),
    listCompanies(),
  ]);
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
}

type Brief = Awaited<ReturnType<typeof loadBrief>>;

async function scoreOne(brief: Brief, posting: JobPosting, model: string, timeout: number) {
  const company = brief.companies.get(companyKey(posting.company));
  const { output } = await generateText({
    model,
    instructions: INSTRUCTIONS,
    prompt: `${brief.context}\n\n# The job ad\n\n${postingText(posting, company === undefined ? "" : companyFacts(company))}`,
    output: Output.object({ schema: answerSchema, name: "fit" }),
    reasoning: "high",
    maxRetries: 1,
    timeout,
  });
  const score = toScore(output, brief.cvIds);

  await useDb()
    .update(jobPostings)
    .set({
      score: score.score,
      scoreReasons: score.reasons,
      scoreConcerns: score.concerns,
      scoreCvId: score.cvId,
      scoreModel: model,
      scoredAt: new Date(),
    })
    .where(eq(jobPostings.id, posting.id));
}

/**
 * The postings due for a score, newest first: not dismissed, not applied to,
 * and unscored or scored before the search notes last changed. With ids,
 * those, also if scored.
 */
async function dueIds(notesAt: string, ids: string[] | undefined): Promise<string[]> {
  if (ids !== undefined) {
    return ids;
  }

  const applied = useDb()
    .select({ postingId: applications.postingId })
    .from(applications)
    .where(isNotNull(applications.postingId));
  const stale =
    notesAt === ""
      ? isNull(jobPostings.scoredAt)
      : or(isNull(jobPostings.scoredAt), lt(jobPostings.scoredAt, new Date(notesAt)));
  const rows = await useDb()
    .select({ id: jobPostings.id })
    .from(jobPostings)
    .where(and(ne(jobPostings.status, "dismissed"), stale, notInArray(jobPostings.id, applied)))
    // Unscored first, then the stale ones; newest first within each.
    .orderBy(desc(isNull(jobPostings.scoredAt)), desc(jobPostings.createdAt), desc(jobPostings.id));

  return rows.map((row) => row.id);
}

/** Why a run failed, in plain words; the SDK's messages carry terminal colours. */
function failure(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Scoring failed.";
  }

  if (error.name === "GatewayAuthenticationError") {
    // Never an API key: one could be charged. The deployment's token can't.
    return "The AI Gateway needs the deployment's OIDC token: scoring runs on Vercel, or locally after `vercel env pull`.";
  }

  // oxlint-disable-next-line no-control-regex -- strips ANSI colour codes
  return error.message.replaceAll(/\u001b\[\d+m/gu, "");
}

/**
 * Scores postings one at a time until the deadline: the ones due, or the
 * given ones. Stops at the first failure: the next would most likely fail
 * the same way (no sign-in, no network, the model gone).
 */
async function scorePostings({
  deadline,
  ids,
}: {
  deadline: number;
  ids?: string[];
}): Promise<ScoreRun> {
  const model = scoreModel();
  const run: ScoreRun = { model, scored: [], error: "", left: 0 };

  try {
    if (!(await isFree(model))) {
      return Object.assign(run, {
        error: `"${model}" isn't free at every provider, so it doesn't run. Set JOB_SCORE_MODEL to a free model.`,
      });
    }

    const brief = await loadBrief();
    const due = await dueIds(brief.notesAt, ids);

    run.left = due.length;

    async function scoreNext(id: string) {
      const remaining = deadline - Date.now();

      if (remaining < 5000) {
        return;
      }

      await scoreOne(brief, await requirePosting(id), model, Math.min(CALL_TIMEOUT_MS, remaining));
      run.scored.push(id);
      run.left -= 1;
    }

    // One at a time on purpose: a free model's rate limits are tight. A
    // failure rejects the chain, so the rest are skipped.
    await due.reduce<Promise<void>>(
      (previous, id) => previous.then(() => scoreNext(id)),
      Promise.resolve(),
    );
  } catch (error) {
    run.error = failure(error);
  }

  return run;
}

export { scoreModel, scorePostings };
export type { ScoreRun };
