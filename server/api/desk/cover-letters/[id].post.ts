import { defineEventHandler, getRouterParam, readBody, setResponseStatus } from "h3";
import { parseCoverLetterBody } from "../../../utils/cover-letter-body";
import { saveCoverLetter } from "../../../utils/cover-letters";

// Creates a cover letter; 409 if the id is taken.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const letter = parseCoverLetterBody(getRouterParam(event, "id") ?? "", await readBody(event));

  await saveCoverLetter(letter, { create: true });
  setResponseStatus(event, 201);

  return letter;
});
