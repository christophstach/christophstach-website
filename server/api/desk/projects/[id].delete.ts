import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { deleteProject } from "../../../utils/projects";
import { publicPaths } from "../../../utils/cv-public-paths";
import { revalidatePaths } from "../../../utils/cv-pdf";

// Deletes a project, takes it out of every variant, and renews the PDF and /curriculum.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  await deleteProject(getRouterParam(event, "id") ?? "");
  await revalidatePaths(event, publicPaths({ primary: true, website: true }));
  setResponseStatus(event, 204);
});
