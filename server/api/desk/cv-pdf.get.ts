import { createError, defineEventHandler, getQuery, getRequestURL } from "h3";
import { cvVariants, primaryVariantId } from "../../../app/data/cv-variants";
import { getDocumentProxy } from "unpdf";
import { renderPdf } from "../../utils/cv-pdf";

// The @page margin in CvDocument.vue (18mm), in PDF points.
const PAGE_MARGIN = (18 / 25.4) * 72;

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

async function pageFills(data: Uint8Array) {
  try {
    const pdf = await getDocumentProxy(data);
    const pageNumbers = Array.from({ length: pdf.numPages }, (_unused, index) => index + 1);

    return await Promise.all(
      pageNumbers.map(async (pageNumber) => ({ fill: await pageFill(pdf, pageNumber) })),
    );
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Reading the PDF failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * The primary variant is read from the public PDF, so this reads the cached
 * file that visitors download and only runs Chrome when that cache is cold.
 * Other variants are private and rendered for the request.
 */
async function variantPdf(event: Parameters<typeof renderPdf>[0], id: string) {
  if (id !== primaryVariantId) {
    return renderPdf(event, `/desk/cv-print/${id}`, true);
  }

  const response = await fetch(new URL("/christoph-stach-cv.pdf", getRequestURL(event).origin));

  // Errors carry their cause to the desk, which shows it: the PDF route runs
  // Chrome on Vercel, and its failures are otherwise only in the function logs.
  if (!response.ok) {
    throw createError({
      statusCode: 502,
      message: `The PDF route answered ${response.status} ${response.statusText}.`,
    });
  }

  return new Uint8Array(await response.arrayBuffer());
}

// requireUserSession is a Nitro auto-import (see server/routes/auth/github.get.ts).
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const id = String(getQuery(event).variant ?? primaryVariantId);

  if (!cvVariants.some((variant) => variant.id === id)) {
    throw createError({ statusCode: 404, message: `No CV variant "${id}".` });
  }

  return { pages: await pageFills(await variantPdf(event, id)) };
});
