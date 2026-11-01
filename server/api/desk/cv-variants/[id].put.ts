import { defineEventHandler, getRouterParam, readBody } from "h3";
import { listVariants, saveVariant } from "../../../utils/cv-variants";
import { parseVariantBody } from "../../../utils/cv-variant-body";
import { publicPaths } from "../../../utils/cv-public-paths";
import { revalidatePaths } from "../../../utils/cv-pdf";

// Updates a variant. Saving the primary or the website variant also renews the
// cached public pages that show it.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const variant = parseVariantBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveVariant(variant, { create: false });

  const { primaryId, websiteId } = await listVariants();

  await revalidatePaths(
    event,
    publicPaths({ primary: primaryId === variant.id, website: websiteId === variant.id }),
  );

  return variant;
});
