import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from "h3";
import { allPublicPaths } from "../../../utils/cv-public-paths";
import { parseEntryBody } from "../../../utils/cv-content-body";
import { revalidatePaths } from "../../../utils/cv-pdf";
import { saveEntry } from "../../../utils/cv-content";

// Creates an entry; 409 if the id is taken. The home page counts the
// experience entries, so the public pages are renewed.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const entry = parseEntryBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveEntry(entry, { create: true });
  await revalidatePaths(event, allPublicPaths());
  setResponseStatus(event, 201);

  return entry;
});
