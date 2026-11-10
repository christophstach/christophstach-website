import "server-only";
import { CV_LAYOUT_STEPS, layoutQuery, sameLayout } from "../data/cv-print-layout";
import {
  deleteVariant as deleteStoredVariant,
  listVariants,
  markVariant,
  printStoredVariant,
  requireVariant,
  saveVariant as saveStoredVariant,
  storePageFills,
} from "./cv-variants";
import { pageFills, points } from "./pdf-pages";
import { renderPdf, revalidatePaths } from "./cv-pdf";
import { CV_PDF_PATH } from "../data/endpoints";
import type { CvLayout } from "../data/cv-print-layout";
import { HttpError } from "./http";
import { currentRequest } from "./desk-write";
import { parseVariantBody } from "./cv-variant-body";
import { paths } from "../router";
import { publicPaths } from "./cv-public-paths";
import { requireUser } from "./auth";

// The desk's CV variant writes, prints and page checks. Each checks the
// session first and parses its input.

async function saveVariant(id: string, body: unknown, { create }: { create: boolean }) {
  await requireUser();

  const variant = parseVariantBody(id, body);

  await saveStoredVariant(variant, { create });

  // A new variant has no public role yet; saving one that has renews it.
  if (!create) {
    const { primaryId, websiteId } = await listVariants();

    await revalidatePaths(
      currentRequest(),
      publicPaths({ primary: primaryId === variant.id, website: websiteId === variant.id }),
    );
  }

  return variant;
}

async function deleteVariant(id: string) {
  await requireUser();
  await deleteStoredVariant(id);
}

/** Gives a variant the primary role (the PDF) or the website role (/curriculum). */
async function markRole(id: string, role: "primary" | "website") {
  await requireUser();
  await markVariant(id, role === "primary" ? "isPrimary" : "isWebsite");
  await revalidatePaths(
    currentRequest(),
    publicPaths({ primary: role === "primary", website: role === "website" }),
  );
}

/** A variant's printed content, with trial layout steps when given. */
async function printForDesk(id: string, layout: CvLayout | undefined) {
  await requireUser();

  const cv = await printStoredVariant(await requireVariant(id));

  return layout === undefined ? cv : { ...cv, layout };
}

/**
 * The primary variant is read from the public PDF, so this reads the cached
 * file that visitors download and only runs Chrome when that cache is cold.
 * Other variants are private and rendered for the request.
 */
async function variantPdf(request: Request, id: string, primaryId: string) {
  if (id !== primaryId) {
    return renderPdf(request, paths.desk["cv-print"](id)(), true);
  }

  const response = await fetch(new URL(CV_PDF_PATH, request.url));

  // Errors carry their cause to the desk, which shows it: the PDF route runs
  // Chrome on Vercel, and its failures are otherwise only in the function logs.
  if (!response.ok) {
    throw new HttpError(502, `The PDF route answered ${response.status} ${response.statusText}.`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

/** The pages of a variant printed with trial steps; never stored. */
async function trialPages(request: Request, id: string, layout: CvLayout) {
  const path = paths.desk["cv-print"](id, layoutQuery(layout));

  return pageFills(
    await renderPdf(request, path, true),
    points(CV_LAYOUT_STEPS.margin[layout.margin]),
  );
}

/** The pages of a variant with its stored steps; the result is stored with it. */
async function storedPages(
  request: Request,
  variant: { id: string; layout: CvLayout },
  primaryId: string,
) {
  const margin = points(CV_LAYOUT_STEPS.margin[variant.layout.margin]);
  const pages = await pageFills(await variantPdf(request, variant.id, primaryId), margin);

  await storePageFills(
    variant.id,
    pages.map((page) => page.fill),
  );

  return pages;
}

/**
 * How full each page of a variant's PDF is. Steps that differ from the
 * stored ones are a trial: printed with them, shown, never stored. Otherwise
 * the result is stored with the variant for the overview.
 */
async function checkPages(id: string, trial: CvLayout | undefined) {
  await requireUser();

  const request = currentRequest();
  const { variants, primaryId } = await listVariants();
  const variant = variants.find((candidate) => candidate.id === id);

  if (variant === undefined) {
    throw new HttpError(404, `No CV variant "${id}".`);
  }

  if (trial !== undefined && !sameLayout(trial, variant.layout)) {
    return { pages: await trialPages(request, variant.id, trial), trial: true };
  }

  return { pages: await storedPages(request, variant, primaryId), trial: false };
}

export { checkPages, deleteVariant, markRole, printForDesk, saveVariant };
