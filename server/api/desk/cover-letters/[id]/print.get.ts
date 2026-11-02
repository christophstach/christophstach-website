import { defineEventHandler, getRouterParam } from "h3";
import { printCoverLetter } from "../../../../utils/cover-letters";

// What the print page shows; never public, a letter names who it is for.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  return printCoverLetter(getRouterParam(event, "id") ?? "");
});
