import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from "h3";
import { parseVariantBody } from "../../../utils/cv-variant-body";
import { saveVariant } from "../../../utils/cv-variants";

// Creates a variant; 409 if the id is taken. Updates go through PUT.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const variant = parseVariantBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveVariant(variant, { create: true });
  setResponseStatus(event, 201);

  return variant;
});
