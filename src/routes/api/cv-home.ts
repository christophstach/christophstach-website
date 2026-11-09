import type { APIHandler } from "filesystem-routing/api";
import type { CvHome } from "../../data/public-api";
import { loadCvContent } from "../../server/cv-content";

// What the home page shows of the CV: when and where each job ran (for the
// years of experience and the companies) and every skill group. Cached with
// ISR, renewed by the desk.
export const GET: APIHandler = async () => {
  const { experience, skills } = await loadCvContent();
  const body: CvHome = {
    experience: experience.map(({ from, to, organization }) =>
      to === undefined ? { from, organization } : { from, to, organization },
    ),
    skills,
  };

  return Response.json(body);
};
