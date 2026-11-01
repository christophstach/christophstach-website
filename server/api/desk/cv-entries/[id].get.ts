import { defineEventHandler, getRouterParam } from "h3";
import { requireEntry } from "../../../utils/cv-content";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  return requireEntry(getRouterParam(event, "id") ?? "");
});
