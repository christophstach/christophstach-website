import { defineEventHandler } from "h3";
import { listCoverLetters } from "../../../utils/cover-letters";

// requireUserSession is a Nitro auto-import (see server/routes/auth/github.get.ts).
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  return listCoverLetters();
});
