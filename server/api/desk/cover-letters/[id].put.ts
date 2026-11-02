import { defineEventHandler, getRouterParam, readBody } from "h3";
import { parseCoverLetterBody } from "../../../utils/cover-letter-body";
import { saveCoverLetter } from "../../../utils/cover-letters";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const letter = parseCoverLetterBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveCoverLetter(letter, { create: false });

  return letter;
});
