import { defineEventHandler, getRouterParam } from "h3";
import { markVariant } from "../../../../utils/cv-variants";
import { publicPaths } from "../../../../utils/cv-public-paths";
import { revalidatePaths } from "../../../../utils/cv-pdf";

// Makes a variant the public CV and renews the cached public PDF.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const id = getRouterParam(event, "id") ?? "";

  await markVariant(id, "isPrimary");
  await revalidatePaths(event, publicPaths({ primary: true, website: false }));

  return { primaryId: id };
});
