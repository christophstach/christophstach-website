import { defineEventHandler, getRouterParam } from "h3";
import { printVariant } from "../../../../../app/utils/cv-variant";
import { requireVariant } from "../../../../utils/cv-variants";

// The content /desk/cv-print/<id> prints.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  return printVariant(await requireVariant(getRouterParam(event, "id") ?? ""));
});
