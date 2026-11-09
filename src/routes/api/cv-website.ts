import { printStoredVariant, requireMarkedVariant } from "../../server/cv-variants";
import type { APIHandler } from "filesystem-routing/api";
import type { CvWebsite } from "../../data/public-api";

// What /curriculum shows: the website variant's experience, education and
// projects. Cached with ISR and renewed when the desk changes the variant or
// its content.
export const GET: APIHandler = async () => {
  const { experience, education, projects } = await printStoredVariant(
    await requireMarkedVariant("isWebsite"),
  );
  const body: CvWebsite = { experience, education, projects };

  return Response.json(body);
};
