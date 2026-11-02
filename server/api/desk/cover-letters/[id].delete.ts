import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { deleteCoverLetter } from "../../../utils/cover-letters";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  await deleteCoverLetter(getRouterParam(event, "id") ?? "");
  setResponseStatus(event, 204);
});
