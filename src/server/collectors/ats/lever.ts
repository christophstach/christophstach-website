import "server-only";
import { Effect, Option, Schema } from "effect";
import type { AtsReader } from "./types";
import { boardPosting, isoDay, joinPlaces, workplaceInLocation, workplaceWord } from "./types";
import type { AtsBoard } from "../../../data/postings";
import type { FoundPosting } from "../types";
import { ExternalFetchError, runServerEffect } from "../../effect";
import { NO_SALARY } from "../salary";
import type { Salary } from "../salary";
import { SALARY_CURRENCIES } from "../../../data/postings";
import { fetchBoardJsonEffect, mapBoardNotFound } from "./fetch";
import { htmlToText } from "../text";

// Lever's postings API: api.lever.co/v0/postings/<board>?mode=json, or
// api.eu.lever.co for boards hosted in the EU. Each job states its
// workplace, and may state a salary range.

const jobSchema = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  hostedUrl: Schema.String,
  createdAt: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  workplaceType: Schema.optionalKey(Schema.NullOr(Schema.String)),
  categories: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        location: Schema.optionalKey(Schema.NullOr(Schema.String)),
        allLocations: Schema.optionalKey(Schema.NullOr(Schema.Array(Schema.String))),
      }),
    ),
  ),
  descriptionPlain: Schema.optionalKey(Schema.NullOr(Schema.String)),
  lists: Schema.optionalKey(
    Schema.NullOr(
      Schema.Array(
        Schema.Struct({
          text: Schema.optionalKey(Schema.NullOr(Schema.String)),
          content: Schema.optionalKey(Schema.NullOr(Schema.String)),
        }),
      ),
    ),
  ),
  additionalPlain: Schema.optionalKey(Schema.NullOr(Schema.String)),
  salaryRange: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        currency: Schema.optionalKey(Schema.NullOr(Schema.String)),
        interval: Schema.optionalKey(Schema.NullOr(Schema.String)),
        min: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
        max: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
      }),
    ),
  ),
});

const rawBoardSchema = Schema.Array(Schema.Unknown);

type LeverJob = typeof jobSchema.Type;

const decodeRawBoard = Schema.decodeUnknownEffect(rawBoardSchema);
const decodeJob = Schema.decodeUnknownEffect(jobSchema);
const decodeRawJob = Schema.decodeUnknownOption(Schema.fromJsonString(jobSchema));

/** What a year has of each interval Lever states a salary per. */
const PER_YEAR: Record<string, number> = { "per-year-salary": 1, "per-month-salary": 12 };

function salaryOf(range: LeverJob["salaryRange"]): Salary {
  const factor = PER_YEAR[range?.interval ?? ""];
  const min = range?.min ?? null;
  const max = range?.max ?? null;

  if (range === undefined || range === null || factor === undefined) {
    return NO_SALARY;
  }

  if ((min === null || min <= 0) && (max === null || max <= 0)) {
    return NO_SALARY;
  }

  return {
    salaryMin: min === null || min <= 0 ? null : Math.round(min * factor),
    salaryMax: max === null || max <= 0 ? null : Math.round(max * factor),
    salaryCurrency: SALARY_CURRENCIES.find((code) => code === range.currency?.toUpperCase()) ?? "",
  };
}

/** The ad's text: its description, then each list under its heading, then the rest. */
function descriptionOf(job: LeverJob): string {
  const lists = (job.lists ?? []).map((list) =>
    [list.text ?? "", htmlToText(list.content ?? "")].filter((part) => part !== "").join("\n"),
  );

  return [job.descriptionPlain ?? "", ...lists, job.additionalPlain ?? ""]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join("\n\n");
}

function toPosting(job: LeverJob, board: AtsBoard, raw: string): FoundPosting {
  const location = joinPlaces(
    job.categories?.allLocations ?? [job.categories?.location ?? undefined],
  );

  return {
    ...boardPosting(board, job.id),
    url: job.hostedUrl,
    title: job.text.trim(),
    location,
    description: descriptionOf(job),
    postedOn: isoDay(job.createdAt ?? undefined),
    workplace: workplaceWord(job.workplaceType ?? undefined) || workplaceInLocation(location),
    ...salaryOf(job.salaryRange),
    raw,
  };
}

function fetchJobsEffect(
  board: AtsBoard,
): Effect.Effect<{ body: unknown; url: string }, ExternalFetchError> {
  const path = `/v0/postings/${encodeURIComponent(board.board)}?mode=json`;
  const globalUrl = `https://api.lever.co${path}`;
  const euUrl = `https://api.eu.lever.co${path}`;

  return fetchBoardJsonEffect(globalUrl, board).pipe(
    Effect.map((body) => ({ body, url: globalUrl })),
    // Not on the global instance: maybe on the EU one.
    Effect.catchIf(
      (error) => error.upstreamStatus === 404,
      () => fetchBoardJsonEffect(euUrl, board).pipe(Effect.map((body) => ({ body, url: euUrl }))),
    ),
  );
}

function readLeverEffect(board: AtsBoard): Effect.Effect<FoundPosting[], ExternalFetchError> {
  return Effect.gen(function* () {
    const { body, url } = yield* fetchJobsEffect(board);
    const rawJobs = yield* decodeRawBoard(body).pipe(
      Effect.mapError(
        (cause) =>
          new ExternalFetchError({
            message: `Lever's board "${board.board}" no longer reads as expected.`,
            url,
            cause,
          }),
      ),
    );
    const jobs = yield* Effect.forEach(rawJobs, (rawJob) =>
      decodeJob(rawJob).pipe(
        Effect.map((job) => ({ job, raw: JSON.stringify(rawJob) })),
        Effect.mapError(
          (cause) =>
            new ExternalFetchError({
              message: `Lever's board "${board.board}" no longer reads as expected.`,
              url,
              cause,
            }),
        ),
      ),
    );

    return jobs.map(({ job, raw }) => toPosting(job, board, raw));
  });
}

const lever: AtsReader = {
  provider: "lever",
  readEffect: readLeverEffect,
  async read(board) {
    return runServerEffect(mapBoardNotFound(readLeverEffect(board)));
  },
  reread(raw, board) {
    const parsed = decodeRawJob(raw);

    return Option.isSome(parsed) ? toPosting(parsed.value, board, raw) : undefined;
  },
};

export { lever, readLeverEffect };
