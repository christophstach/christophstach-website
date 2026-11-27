import "server-only";
import { Effect, Option, Schema } from "effect";
import type { AtsReader } from "./types";
import { boardPosting, isoDay, workplaceInLocation } from "./types";
import { decodeEntities, htmlToText } from "../text";
import type { AtsBoard } from "../../../data/postings";
import type { FoundPosting } from "../types";
import { ExternalFetchError, runServerEffect } from "../../effect";
import { fetchBoardJsonEffect, mapBoardNotFound } from "./fetch";

// Greenhouse's job board API: boards-api.greenhouse.io/v1/boards/<board>/jobs.
// content=true adds each job's text, as HTML escaped once more. It states no
// workplace or salary of its own: the location may say "Remote".

const jobSchema = Schema.Struct({
  id: Schema.Finite,
  title: Schema.String,
  absolute_url: Schema.String,
  location: Schema.optionalKey(
    Schema.NullOr(Schema.Struct({ name: Schema.optionalKey(Schema.NullOr(Schema.String)) })),
  ),
  first_published: Schema.optionalKey(Schema.NullOr(Schema.String)),
  updated_at: Schema.optionalKey(Schema.NullOr(Schema.String)),
  company_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  content: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const rawBoardSchema = Schema.Struct({ jobs: Schema.Array(Schema.Unknown) });

const decodeRawBoard = Schema.decodeUnknownEffect(rawBoardSchema);
const decodeJob = Schema.decodeUnknownEffect(jobSchema);
const decodeRawJob = Schema.decodeUnknownOption(Schema.fromJsonString(jobSchema));

function toPosting(job: typeof jobSchema.Type, board: AtsBoard, raw: string): FoundPosting {
  const location = (job.location?.name ?? "").trim();

  return {
    ...boardPosting(board, String(job.id)),
    url: job.absolute_url,
    company: board.company || (job.company_name ?? ""),
    title: job.title.trim(),
    location,
    description: htmlToText(decodeEntities(job.content ?? "")),
    postedOn: isoDay(job.first_published ?? job.updated_at ?? undefined),
    workplace: workplaceInLocation(location),
    raw,
  };
}

function readGreenhouseEffect(board: AtsBoard): Effect.Effect<FoundPosting[], ExternalFetchError> {
  return Effect.gen(function* () {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.board)}/jobs?content=true`;
    const body = yield* fetchBoardJsonEffect(url, board);
    const rawBoard = yield* decodeRawBoard(body).pipe(
      Effect.mapError(
        (cause) =>
          new ExternalFetchError({
            message: `Greenhouse's board "${board.board}" no longer reads as expected.`,
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
              message: `Greenhouse's board "${board.board}" no longer reads as expected.`,
              url,
              cause,
            }),
        ),
      ),
    );

    return jobs.map(({ job, raw }) => toPosting(job, board, raw));
  });
}

const greenhouse: AtsReader = {
  provider: "greenhouse",
  readEffect: readGreenhouseEffect,
  async read(board) {
    return runServerEffect(mapBoardNotFound(readGreenhouseEffect(board)));
  },
  reread(raw, board) {
    const parsed = decodeRawJob(raw);

    return Option.isSome(parsed) ? toPosting(parsed.value, board, raw) : undefined;
  },
};

export { greenhouse, readGreenhouseEffect };
