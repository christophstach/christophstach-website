import { defineEventHandler, getRouterParam, readBody } from "h3";
import { parseProjectBody } from "../../../utils/project-body";
import { publicPaths } from "../../../utils/cv-public-paths";
import { revalidatePaths } from "../../../utils/cv-pdf";
import { saveProject } from "../../../utils/projects";

// Updates a project and renews the public PDF and /curriculum, which may show it.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const project = parseProjectBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveProject(project, { create: false });
  await revalidatePaths(event, publicPaths({ primary: true, website: true }));

  return project;
});
