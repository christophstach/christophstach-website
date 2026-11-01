import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { deleteVariant } from "../../../utils/cv-variants";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  await deleteVariant(getRouterParam(event, "id") ?? "");
  setResponseStatus(event, 204);
});
