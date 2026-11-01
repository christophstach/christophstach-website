import { defineEventHandler, getRouterParam } from "h3";
import { revalidatePublicPdf } from "../../../../utils/cv-pdf";
import { setPrimaryVariant } from "../../../../utils/cv-variants";

// Makes a variant the public CV and renews the cached public PDF.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const id = getRouterParam(event, "id") ?? "";

  await setPrimaryVariant(id);
  await revalidatePublicPdf(event);

  return { primaryId: id };
});
