import { defineEventHandler } from "h3";
import { loadProfile } from "../../utils/cv-content";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  return loadProfile();
});
