import "server-only";
import { Effect, Option, Schema } from "effect";
import type { AtsReader } from "./types";
import { boardPosting, isoDay, joinPlaces, workplaceInLocation, workplaceWord } from "./types";
import type { AtsBoard } from "../../../data/postings";
import type { FoundPosting } from "../types";
import { ExternalFetchError, runServerEffect } from "../../effect";
import { NO_SALARY } from "../salary";
import { SALARY_CURRENCIES } from "../../../data/postings";
import type { Salary } from "../salary";
import { fetchBoardJsonEffect, mapBoardNotFound } from "./fetch";

// Ashby's public job board API:
// api.ashbyhq.com/posting-api/job-board/<board>?includeCompensation=true.
// Each job states its workplace, and its salary where the company shows it.

const componentSchema = Schema.Struct({
  compensationType: Schema.optionalKey(Schema.NullOr(Schema.String)),
  interval: Schema.optionalKey(Schema.NullOr(Schema.String)),
  currencyCode: Schema.optionalKey(Schema.NullOr(Schema.String)),
  minValue: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  maxValue: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
});

const jobSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  jobUrl: Schema.String,
  location: Schema.optionalKey(Schema.NullOr(Schema.String)),
  secondaryLocations: Schema.optionalKey(
    Schema.NullOr(
      Schema.Array(Schema.Struct({ location: Schema.optionalKey(Schema.NullOr(Schema.String)) })),
    ),
  ),
  workplaceType: Schema.optionalKey(Schema.NullOr(Schema.String)),
  isRemote: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  isListed: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  publishedAt: Schema.optionalKey(Schema.NullOr(Schema.String)),
  descriptionPlain: Schema.optionalKey(Schema.NullOr(Schema.String)),
  compensation: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        summaryComponents: Schema.optionalKey(Schema.NullOr(Schema.Array(componentSchema))),
      }),
    ),
  ),
});

const rawBoardSchema = Schema.Struct({ jobs: Schema.Array(Schema.Unknown) });

type AshbyJob = typeof jobSchema.Type;

const decodeRawBoard = Schema.decodeUnknownEffect(rawBoardSchema);
const decodeJob = Schema.decodeUnknownEffect(jobSchema);
const decodeRawJob = Schema.decodeUnknownOption(Schema.fromJsonString(jobSchema));

/** What a year has of each interval Ashby states pay per. */
const PER_YEAR: Record<string, number> = { "1 YEAR": 1, "1 MONTH": 12 };

function salaryOf(job: AshbyJob): Salary {
  const salary = (job.compensation?.summaryComponents ?? []).find(
    (component) =>
      component.compensationType === "Salary" && PER_YEAR[component.interval ?? ""] !== undefined,
  );
  const factor = PER_YEAR[salary?.interval ?? ""] ?? 1;
  const min = salary?.minValue ?? null;
  const max = salary?.maxValue ?? null;

  if (salary === undefined || (min === null && max === null)) {
    return NO_SALARY;
  }

  return {
    salaryMin: min === null ? null : Math.round(min * factor),
    salaryMax: max === null ? null : Math.round(max * factor),
    salaryCurrency:
      SALARY_CURRENCIES.find((code) => code === salary.currencyCode?.toUpperCase()) ?? "",
  };
}

function toPosting(job: AshbyJob, board: AtsBoard, raw: string): FoundPosting {
  const location = joinPlaces([
    job.location ?? undefined,
    ...(job.secondaryLocations ?? []).map((place) => place.location ?? undefined),
  ]);

  return {
    ...boardPosting(board, job.id),
    url: job.jobUrl,
    title: job.title.trim(),
    location,
    description: (job.descriptionPlain ?? "").trim(),
    postedOn: isoDay(job.publishedAt ?? undefined),
    workplace:
      workplaceWord(job.workplaceType ?? undefined) ||
      (job.isRemote === true ? "remote" : workplaceInLocation(location)),
    ...salaryOf(job),
    raw,
  };
}

function readAshbyEffect(board: AtsBoard): Effect.Effect<FoundPosting[], ExternalFetchError> {
  return Effect.gen(function* () {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.board)}?includeCompensation=true`;
    const body = yield* fetchBoardJsonEffect(url, board);
    const rawBoard = yield* decodeRawBoard(body).pipe(
      Effect.mapError(
        (cause) =>
          new ExternalFetchError({
            message: `Ashby's board "${board.board}" no longer reads as expected.`,
            url,
            cause,
          }),
      ),
    );
    const jobs = yield* Effect.forEach(rawBoard.jobs, (rawJob) =>
      decodeJob(rawJob).pipe(
        Effect.map((job) => ({ job, raw: JSON.stringify(rawJob) })),
        Effect.mapError(
          (cause) =>
            new ExternalFetchError({
              message: `Ashby's board "${board.board}" no longer reads as expected.`,
              url,
              cause,
            }),
        ),
      ),
    );

    // An unlisted job is reachable by its link only: the company doesn't advertise it.
    return jobs
      .filter(({ job }) => job.isListed !== false)
      .map(({ job, raw }) => toPosting(job, board, raw));
  });
}

const ashby: AtsReader = {
  provider: "ashby",
  readEffect: readAshbyEffect,
  async read(board) {
    return runServerEffect(mapBoardNotFound(readAshbyEffect(board)));
  },
  reread(raw, board) {
    const parsed = decodeRawJob(raw);

    return Option.isSome(parsed) ? toPosting(parsed.value, board, raw) : undefined;
  },
};

export { ashby, readAshbyEffect };
