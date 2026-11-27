import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import type { CvWebsite } from "../../data/public-api";
import { printStoredCvEffect, requireMarkedCvEffect } from "../../server/cvs";
import { runApiEffect } from "../../server/effect";

// What /curriculum shows: the website CV's experience, education and
// projects. Cached with ISR and renewed when the desk changes the CV or
// its content.
export const GET: APIHandler = () =>
  runApiEffect(
    Effect.gen(function* () {
      const marked = yield* requireMarkedCvEffect("isWebsite");
      const { experience, education, projects } = yield* printStoredCvEffect(marked);
      const body: CvWebsite = { experience, education, projects };

      return Response.json(body);
    }),
  );
