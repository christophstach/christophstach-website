import { defineEventHandler, getRouterParam } from "h3";
import { requireProject } from "../../../utils/projects";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  return requireProject(getRouterParam(event, "id") ?? "");
});
