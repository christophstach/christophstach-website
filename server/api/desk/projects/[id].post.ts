import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from "h3";
import { parseProjectBody } from "../../../utils/project-body";
import { saveProject } from "../../../utils/projects";

// Creates a project; 409 if the id is taken. A new project shows nowhere until
// a variant picks it, so no cached page needs renewing.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const project = parseProjectBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveProject(project, { create: true });
  setResponseStatus(event, 201);

  return project;
});
