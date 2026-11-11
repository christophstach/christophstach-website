import "server-only";
import { CV_LAYOUT_STEPS, layoutQuery, sameLayout } from "../data/cv-print-layout";
import {
  deleteCv as deleteStoredCv,
  listCvs,
  markCv,
  printStoredCv,
  requireCv,
  saveCv as saveStoredCv,
  storePageFills,
} from "./cvs";
import { pageFills, points } from "./pdf-pages";
import { renderPdf, revalidatePaths } from "./cv-pdf";
import { CV_PDF_PATH } from "../data/endpoints";
import type { CvLayout } from "../data/cv-print-layout";
import { HttpError } from "./http";
import { currentRequest } from "./desk-write";
import { parseCvBody } from "./cv-body";
import { paths } from "../router";
import { publicPaths } from "./cv-public-paths";
import { requireUser } from "./auth";

// The desk's CV writes, prints and page checks. Each checks the
// session first and parses its input.

async function saveCv(id: string, body: unknown, { create }: { create: boolean }) {
  await requireUser();

  const cv = parseCvBody(id, body);

  await saveStoredCv(cv, { create });

  // A new CV has no public role yet; saving one that has renews it.
  if (!create) {
    const { primaryId, websiteId } = await listCvs();

    await revalidatePaths(
      currentRequest(),
      publicPaths({ primary: primaryId === cv.id, website: websiteId === cv.id }),
    );
  }

  return cv;
}

async function deleteCv(id: string) {
  await requireUser();
  await deleteStoredCv(id);
}

/** Gives a CV the primary role (the PDF) or the website role (/curriculum). */
async function markRole(id: string, role: "primary" | "website") {
  await requireUser();
  await markCv(id, role === "primary" ? "isPrimary" : "isWebsite");
  await revalidatePaths(
    currentRequest(),
    publicPaths({ primary: role === "primary", website: role === "website" }),
  );
}

/** A CV's printed content, with trial layout steps when given. */
async function printForDesk(id: string, layout: CvLayout | undefined) {
  await requireUser();

  const cv = await printStoredCv(await requireCv(id));

  return layout === undefined ? cv : { ...cv, layout };
}

/**
 * The primary CV is read from the public PDF, so this reads the cached
 * file that visitors download and only runs Chrome when that cache is cold.
 * Other CVs are private and rendered for the request.
 */
async function cvPdf(request: Request, id: string, primaryId: string) {
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

/** The pages of a CV printed with trial steps; never stored. */
async function trialPages(request: Request, id: string, layout: CvLayout) {
  const path = paths.desk["cv-print"](id, layoutQuery(layout));

  return pageFills(
    await renderPdf(request, path, true),
    points(CV_LAYOUT_STEPS.margin[layout.margin]),
  );
}

/**
 * The pages of a CV with its stored steps; the result is stored with it.
 * Checks no session: the caller does, and `request` carries the one Chrome uses.
 */
async function storedPages(
  request: Request,
  cv: { id: string; layout: CvLayout },
  primaryId: string,
) {
  const margin = points(CV_LAYOUT_STEPS.margin[cv.layout.margin]);
  const pages = await pageFills(await cvPdf(request, cv.id, primaryId), margin);

  await storePageFills(
    cv.id,
    pages.map((page) => page.fill),
  );

  return pages;
}

/**
 * How full each page of a CV's PDF is. Steps that differ from the
 * stored ones are a trial: printed with them, shown, never stored. Otherwise
 * the result is stored with the CV for the overview.
 */
async function checkPages(id: string, trial: CvLayout | undefined) {
  await requireUser();

  const request = currentRequest();
  const { cvs, primaryId } = await listCvs();
  const cv = cvs.find((candidate) => candidate.id === id);

  if (cv === undefined) {
    throw new HttpError(404, `No CV "${id}".`);
  }

  if (trial !== undefined && !sameLayout(trial, cv.layout)) {
    return { pages: await trialPages(request, cv.id, trial), trial: true };
  }

  return { pages: await storedPages(request, cv, primaryId), trial: false };
}

export { checkPages, deleteCv, markRole, printForDesk, saveCv, storedPages };
