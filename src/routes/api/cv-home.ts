import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import type { CvHome } from "../../data/public-api";
import { loadCvContentEffect } from "../../server/cv-content";
import { runApiEffect } from "../../server/effect";

// What the home page shows of the CV: when and where each job ran (for the
// years of experience and the companies) and every skill group. Cached with
// ISR, renewed by the desk.
export const GET: APIHandler = () =>
  runApiEffect(
    loadCvContentEffect().pipe(
      Effect.map(({ experience, skills }) => {
        const body: CvHome = {
          experience: experience.map(({ from, to, organization }) =>
            to === undefined ? { from, organization } : { from, to, organization },
          ),
          skills,
        };

        return Response.json(body);
      }),
    ),
  );
