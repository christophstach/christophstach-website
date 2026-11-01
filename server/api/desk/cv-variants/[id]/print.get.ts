import { defineEventHandler, getRouterParam } from "h3";
import { printStoredVariant, requireVariant } from "../../../../utils/cv-variants";

// The content /desk/cv-print/<id> prints.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  return printStoredVariant(await requireVariant(getRouterParam(event, "id") ?? ""));
});
