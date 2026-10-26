import { defineEventHandler, getRequestURL } from "h3";

// Page objects in the PDF. Chrome writes each page as a plain `/Type /Page`
// dictionary (no object streams), so counting them needs no PDF parser.
const PAGE_OBJECT = /\/Type\s*\/Page(?!s)/gu;

// requireUserSession is a Nitro auto-import (see server/routes/auth/github.get.ts).
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  // Fetched over HTTP rather than rendered here, so this reads the cached PDF
  // that visitors download and only runs Chrome when that cache is cold.
  const response = await fetch(new URL("/christoph-stach-cv.pdf", getRequestURL(event).origin));

  if (!response.ok) {
    throw new Error(`[cv-pdf] PDF request failed with ${response.status}`);
  }

  const pdf = new TextDecoder("latin1").decode(await response.arrayBuffer());

  return { pages: pdf.match(PAGE_OBJECT)?.length ?? 0 };
});
