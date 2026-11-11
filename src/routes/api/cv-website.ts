import { printStoredCv, requireMarkedCv } from "../../server/cvs";
import type { APIHandler } from "filesystem-routing/api";
import type { CvWebsite } from "../../data/public-api";

// What /curriculum shows: the website CV's experience, education and
// projects. Cached with ISR and renewed when the desk changes the CV or
// its content.
export const GET: APIHandler = async () => {
  const { experience, education, projects } = await printStoredCv(
    await requireMarkedCv("isWebsite"),
  );
  const body: CvWebsite = { experience, education, projects };

  return Response.json(body);
};
