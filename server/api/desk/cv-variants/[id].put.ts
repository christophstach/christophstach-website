import { defineEventHandler, getRouterParam, readBody } from "h3";
import { listVariants, saveVariant } from "../../../utils/cv-variants";
import { parseVariantBody } from "../../../utils/cv-variant-body";
import { revalidatePublicPdf } from "../../../utils/cv-pdf";

// Updates a variant. Saving the primary one also renews the cached public PDF.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const variant = parseVariantBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveVariant(variant, { create: false });

  const { primaryId } = await listVariants();

  if (primaryId === variant.id) {
    await revalidatePublicPdf(event);
  }

  return variant;
});
