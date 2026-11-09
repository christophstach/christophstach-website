import "server-only";
import { HttpError } from "./http";
import { getDocumentProxy } from "unpdf";

type Pdf = Awaited<ReturnType<typeof getDocumentProxy>>;

/** A margin in mm, a document's @page margin, in PDF points. */
function points(mm: number): number {
  return (mm / 25.4) * 72;
}

/** How far down its printable area a page's text reaches, from 0 to 1. */
async function pageFill(pdf: Pdf, pageNumber: number, margin: number) {
  const page = await pdf.getPage(pageNumber);
  const pageHeight = page.view[3] ?? 0;
  const { items } = await page.getTextContent();

  // PDF y runs bottom-up, so the lowest line of text has the smallest baseline.
  // pdf.js types the transform matrix as any[]: check each baseline is a number.
  const baselines = items.flatMap((item) => {
    if (!("str" in item) || item.str.trim() === "") {
      return [];
    }

    const baseline: unknown = item.transform[5];

    return typeof baseline === "number" ? [baseline] : [];
  });

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
    throw new HttpError(
      500,
      `Reading the PDF failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export { pageFills, points };
