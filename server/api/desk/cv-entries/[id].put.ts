import { defineEventHandler, getRouterParam, readBody } from "h3";
import { allPublicPaths } from "../../../utils/cv-public-paths";
import { parseEntryBody } from "../../../utils/cv-content-body";
import { revalidatePaths } from "../../../utils/cv-pdf";
import { saveEntry } from "../../../utils/cv-content";

// Updates an entry and renews every public page that may show it.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const entry = parseEntryBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveEntry(entry, { create: false });
  await revalidatePaths(event, allPublicPaths());

  return entry;
});
