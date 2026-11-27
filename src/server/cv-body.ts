import "server-only";
import { Cause, Effect, Exit, Result, Schema } from "effect";
import { CvLayoutSchema } from "../data/cv-print-layout";
import type { Cv } from "../data/cvs";
import { type BadRequestError, toHttpError } from "./effect";
import {
  decodeBodyEffect,
  requireSlugEffect,
  stringListSchema,
  textSchema,
  trimmedSchema,
} from "./input";

/**
 * A CV as the desk sends it. A tab opened before a deploy may lack the
 * newer fields: no note counts as empty, no core technologies or layout keeps
 * the stored ones.
 */
type CvBody = Omit<Cv, "coreTechnologies" | "layout"> & {
  coreTechnologies?: Cv["coreTechnologies"];
  layout?: Cv["layout"];
};

const NOT_CV = "Not a CV.";

const IdsSchema = Schema.mutable(
  Schema.Array(Schema.String.annotate({ message: NOT_CV })),
).annotate({ message: NOT_CV });

const PickSchema = Schema.Struct({
  id: Schema.String.annotate({ message: NOT_CV }),
  bullets: IdsSchema,
}).annotate({ message: NOT_CV });

const PicksSchema = Schema.mutable(Schema.Array(PickSchema)).annotate({ message: NOT_CV });

const CvBodySchema = Schema.Struct({
  label: textSchema(NOT_CV),
  note: Schema.optionalKey(trimmedSchema(NOT_CV)),
  role: trimmedSchema(NOT_CV),
  summary: trimmedSchema(NOT_CV),
  coreTechnologies: Schema.optionalKey(stringListSchema(NOT_CV)),
  experience: PicksSchema,
  education: PicksSchema,
  projects: IdsSchema,
  skills: IdsSchema,
  layout: Schema.optionalKey(CvLayoutSchema),
}).annotate({ message: NOT_CV });

function runSyncBody<A>(effect: Effect.Effect<A, BadRequestError>): A {
  const exit = Effect.runSyncExit(effect);

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findError(exit.cause);

  if (Result.isSuccess(failure)) {
    throw toHttpError(failure.success);
  }

  throw Cause.squash(exit.cause);
}

/**
 * Checks the shape of a CV sent by the desk; the route's id wins over
 * any id in the body. Whether its ids exist in the content is saveCv's check.
 */
function parseCvBodyEffect(id: string, body: unknown): Effect.Effect<CvBody, BadRequestError> {
  return Effect.gen(function* () {
    yield* requireSlugEffect(id);

    const { note, coreTechnologies, layout, ...cv } = yield* decodeBodyEffect(
      CvBodySchema,
      body ?? {},
    );

    return {
      id,
      label: cv.label,
      role: cv.role,
      summary: cv.summary,
      experience: cv.experience.map((pick) => ({ id: pick.id, bullets: [...pick.bullets] })),
      education: cv.education.map((pick) => ({ id: pick.id, bullets: [...pick.bullets] })),
      projects: [...cv.projects],
      skills: [...cv.skills],
      note: note ?? "",
      ...(coreTechnologies === undefined ? {} : { coreTechnologies }),
      ...(layout === undefined ? {} : { layout }),
    };
  });
}

/**
 * Checks the shape of a CV sent by the desk; the route's id wins over
 * any id in the body. Whether its ids exist in the content is saveCv's check.
 */
function parseCvBody(id: string, body: unknown): CvBody {
  return runSyncBody(parseCvBodyEffect(id, body));
}

export type { CvBody };
export { CvBodySchema, parseCvBody, parseCvBodyEffect };
