import {
  CV_LAYOUT_STEPS,
  layoutFromQuery,
  layoutQuery,
  sameLayout,
} from "../../../app/data/cv-print-layout";
import { createError, defineEventHandler, getQuery, getRequestURL } from "h3";
import { listVariants, storePageFills } from "../../utils/cv-variants";
import { pageFills, points } from "../../utils/pdf-pages";
import { renderPdf } from "../../utils/cv-pdf";

type Event = Parameters<typeof renderPdf>[0];

/**
 * The primary variant is read from the public PDF, so this reads the cached
 * file that visitors download and only runs Chrome when that cache is cold.
 * Other variants are private and rendered for the request.
 */
async function variantPdf(event: Event, id: string, primaryId: string) {
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

type Variant = Awaited<ReturnType<typeof listVariants>>["variants"][number];

/**
 * Steps in the query are a trial: the private page prints the variant with
 * them, and the result is only shown, never stored with the variant.
 */
async function trialFills(event: Event, variant: Variant, layout: Variant["layout"]) {
  const path = `/desk/cv-print/${variant.id}?${new URLSearchParams(layoutQuery(layout))}`;
  const margin = points(CV_LAYOUT_STEPS.margin[layout.margin]);

  return pageFills(await renderPdf(event, path, true), margin);
}

/** The variant's PDF with its stored steps; the result is stored with it. */
async function storedFills(event: Event, variant: Variant, primaryId: string) {
  const margin = points(CV_LAYOUT_STEPS.margin[variant.layout.margin]);
  const pages = await pageFills(await variantPdf(event, variant.id, primaryId), margin);

  await storePageFills(
    variant.id,
    pages.map((page) => page.fill),
  );

  return pages;
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

  const layout = layoutFromQuery(variant.layout, getQuery(event));

  if (!sameLayout(layout, variant.layout)) {
    return { pages: await trialFills(event, variant, layout), trial: true };
  }

  return { pages: await storedFills(event, variant, primaryId), trial: false };
});
