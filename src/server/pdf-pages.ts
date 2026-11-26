import "server-only";
import { Effect } from "effect";
import { getDocumentProxy } from "unpdf";
import { PdfRenderError, runServerEffect } from "./effect";

type Pdf = Awaited<ReturnType<typeof getDocumentProxy>>;

export interface PdfPageFill {
  fill: number;
}

/** A margin in mm, a document's @page margin, in PDF points. */
function points(mm: number): number {
  return (mm / 25.4) * 72;
}

/** How far down its printable area a page's text reaches, from 0 to 1. */
function pageFillEffect(
  pdf: Pdf,
  pageNumber: number,
  margin: number,
): Effect.Effect<number, PdfRenderError> {
  return Effect.scoped(
    Effect.gen(function* () {
      const page = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => pdf.getPage(pageNumber),
          catch: (cause) =>
            new PdfRenderError({
              message: `Reading PDF page ${pageNumber} failed.`,
              cause,
            }),
        }),
        (pdfPage) =>
          Effect.try({
            try: () => {
              pdfPage.cleanup();
            },
            catch: (cause) =>
              new PdfRenderError({
                message: `Cleaning up PDF page ${pageNumber} failed.`,
                cause,
              }),
          }).pipe(Effect.ignore({ log: "Warn" })),
      );

      const pageHeight = page.view[3] ?? 0;
      const { items } = yield* Effect.tryPromise({
        try: () => page.getTextContent(),
        catch: (cause) =>
          new PdfRenderError({
            message: `Reading text from PDF page ${pageNumber} failed.`,
            cause,
          }),
      });

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
    }),
  );
}

/** Measures how far down the printable area each page's text reaches. */
function pageFillsEffect(
  data: Uint8Array,
  margin: number,
): Effect.Effect<Array<PdfPageFill>, PdfRenderError> {
  return Effect.scoped(
    Effect.gen(function* () {
      const pdf = yield* Effect.acquireRelease(
        Effect.tryPromise({
          // A copy: pdf.js takes over (detaches) the buffer it reads, and renderPdf
          // shares one render, the same bytes, with the desk's PDF preview request.
          try: () => getDocumentProxy(new Uint8Array(data)),
          catch: (cause) =>
            new PdfRenderError({
              message: "Reading the PDF failed.",
              cause,
            }),
        }),
        (doc) =>
          Effect.tryPromise({
            try: () => doc.loadingTask.destroy(),
            catch: (cause) =>
              new PdfRenderError({
                message: "Destroying PDF document proxy failed.",
                cause,
              }),
          }).pipe(Effect.ignore({ log: "Warn" })),
      );

      const pageNumbers = Array.from({ length: pdf.numPages }, (_unused, index) => index + 1);

      return yield* Effect.forEach(
        pageNumbers,
        (pageNumber) =>
          pageFillEffect(pdf, pageNumber, margin).pipe(Effect.map((fill) => ({ fill }))),
        { concurrency: "unbounded" },
      );
    }),
  );
}

function pageFills(data: Uint8Array, margin: number): Promise<Array<PdfPageFill>> {
  return runServerEffect(pageFillsEffect(data, margin));
}

export { pageFills, pageFillsEffect, points };
