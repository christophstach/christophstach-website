import { createError, defineEventHandler, getRequestURL } from "h3";
import { getDocumentProxy } from "unpdf";

// The vertical @page margin in cv-print.vue (14mm), in PDF points.
const PAGE_MARGIN = (14 / 25.4) * 72;

/** How far down its printable area a page's text reaches, from 0 to 1. */
async function pageFill(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, pageNumber: number) {
  const page = await pdf.getPage(pageNumber);
  const pageHeight = page.view[3] ?? 0;
  const { items } = await page.getTextContent();

  // PDF y runs bottom-up, so the lowest line of text has the smallest baseline.
  const baselines = items.flatMap((item) =>
    "str" in item && item.str.trim() ? [item.transform[5] as number] : [],
  );

  if (baselines.length === 0) {
    return 0;
  }

  const printable = pageHeight - 2 * PAGE_MARGIN;
  const used = pageHeight - PAGE_MARGIN - Math.min(...baselines);

  return Math.min(1, Math.max(0, used / printable));
}

// requireUserSession is a Nitro auto-import (see server/routes/auth/github.get.ts).
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  // Fetched over HTTP rather than rendered here, so this reads the cached PDF
  // that visitors download and only runs Chrome when that cache is cold.
  const response = await fetch(new URL("/christoph-stach-cv.pdf", getRequestURL(event).origin));

  // Errors carry their cause to the desk, which shows it: the PDF route runs
  // Chrome on Vercel, and its failures are otherwise only in the function logs.
  if (!response.ok) {
    throw createError({
      statusCode: 502,
      message: `The PDF route answered ${response.status} ${response.statusText}.`,
    });
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(await response.arrayBuffer()));
    const pageNumbers = Array.from({ length: pdf.numPages }, (_unused, index) => index + 1);
    const pages = await Promise.all(
      pageNumbers.map(async (pageNumber) => ({ fill: await pageFill(pdf, pageNumber) })),
    );

    return { pages };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Reading the PDF failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});
