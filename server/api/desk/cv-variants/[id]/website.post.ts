import { defineEventHandler, getRouterParam } from "h3";
import { markVariant } from "../../../../utils/cv-variants";
import { publicPaths } from "../../../../utils/cv-public-paths";
import { revalidatePaths } from "../../../../utils/cv-pdf";

// Makes a variant the one /curriculum shows and renews the cached page.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const id = getRouterParam(event, "id") ?? "";

  await markVariant(id, "isWebsite");
  await revalidatePaths(event, publicPaths({ primary: false, website: true }));

  return { websiteId: id };
});
