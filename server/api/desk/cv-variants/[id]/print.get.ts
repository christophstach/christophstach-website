import { defineEventHandler, getQuery, getRouterParam } from "h3";
import { printStoredVariant, requireVariant } from "../../../../utils/cv-variants";
import { layoutFromQuery } from "../../../../../app/data/cv-print-layout";

// The content /desk/cv-print/<id> prints. Layout steps in the query
// (?spacing=airy) replace the stored ones, so the desk can try steps before
// saving them.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const cv = await printStoredVariant(await requireVariant(getRouterParam(event, "id") ?? ""));

  return { ...cv, layout: layoutFromQuery(cv.layout, getQuery(event)) };
});
