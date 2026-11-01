import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { allPublicPaths } from "../../../utils/cv-public-paths";
import { deleteEntry } from "../../../utils/cv-content";
import { revalidatePaths } from "../../../utils/cv-pdf";

// Deletes an entry, takes it out of every variant, and renews the public pages.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  await deleteEntry(getRouterParam(event, "id") ?? "");
  await revalidatePaths(event, allPublicPaths());
  setResponseStatus(event, 204);
});
