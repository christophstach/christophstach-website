import { createError, defineEventHandler, getQuery, getRequestURL } from "h3";
import { listVariants, storePageFills } from "../../utils/cv-variants";
import { CV_LAYOUT_STEPS } from "../../../app/data/cv-print-layout";
import { getDocumentProxy } from "unpdf";
import { renderPdf } from "../../utils/cv-pdf";

type Pdf = Awaited<ReturnType<typeof getDocumentProxy>>;

/** A margin in mm, the variant's @page margin, in PDF points. */
function points(mm: number): number {
  return (mm / 25.4) * 72;
}

/** How far down its printable area a page's text reaches, from 0 to 1. */
async function pageFill(pdf: Pdf, pageNumber: number, margin: number) {
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

  const printable = pageHeight - 2 * margin;
  const used = pageHeight - margin - Math.min(...baselines);

  return Math.min(1, Math.max(0, used / printable));
}

async function pageFills(data: Uint8Array, margin: number) {
  try {
    // A copy: pdf.js takes over (detaches) the buffer it reads, and renderPdf
    // shares one render, the same bytes, with the desk's PDF preview request.
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const pageNumbers = Array.from({ length: pdf.numPages }, (_unused, index) => index + 1);

    return await Promise.all(
      pageNumbers.map(async (pageNumber) => ({ fill: await pageFill(pdf, pageNumber, margin) })),
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
async function variantPdf(event: Parameters<typeof renderPdf>[0], id: string, primaryId: string) {
  if (id !== primaryId) {
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

  const { variants, primaryId } = await listVariants();
  const id = String(getQuery(event).variant ?? primaryId);

  const variant = variants.find((candidate) => candidate.id === id);

  if (!variant) {
    throw createError({ statusCode: 404, message: `No CV variant "${id}".` });
  }

  const margin = points(CV_LAYOUT_STEPS.margin[variant.layout.margin]);
  const pages = await pageFills(await variantPdf(event, id, primaryId), margin);

  await storePageFills(
    id,
    pages.map((page) => page.fill),
  );

  return { pages };
});
