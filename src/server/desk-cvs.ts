import "server-only";
import { Effect } from "effect";
import { CV_LAYOUT_STEPS, layoutQuery, sameLayout } from "../data/cv-print-layout";
import {
  deleteCvEffect as deleteStoredCvEffect,
  listCvsEffect,
  markCvEffect,
  printStoredCvEffect,
  requireCvEffect,
  saveCvEffect as saveStoredCvEffect,
  storePageFillsEffect,
} from "./cvs";
import { pageFillsEffect, points } from "./pdf-pages";
import { renderPdfEffect, revalidatePathsEffect } from "./cv-pdf";
import { BadGatewayError, NotFoundError, type PdfRenderError, runServerEffect } from "./effect";
import { CV_PDF_PATH } from "../data/endpoints";
import type { CvLayout } from "../data/cv-print-layout";
import { currentRequestEffect } from "./desk-write";
import { parseCvBodyEffect } from "./cv-body";
import { paths } from "../router";
import { publicPaths } from "./cv-public-paths";
import { requireUserEffect } from "./auth";

// The desk's CV writes, prints and page checks. Each checks the
// session first and parses its input.

function saveCvEffect(id: string, body: unknown, { create }: { create: boolean }) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const cv = yield* parseCvBodyEffect(id, body);

    yield* saveStoredCvEffect(cv, { create });

    // A new CV has no public role yet; saving one that has renews it.
    if (!create) {
      const { primaryId, websiteId } = yield* listCvsEffect();
      const request = yield* currentRequestEffect();

      yield* revalidatePathsEffect(
        request,
        publicPaths({ primary: primaryId === cv.id, website: websiteId === cv.id }),
      );
    }

    return cv;
  });
}

function saveCv(id: string, body: unknown, options: { create: boolean }) {
  return runServerEffect(saveCvEffect(id, body, options));
}

function deleteCvEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deleteStoredCvEffect(id);
  });
}

function deleteCv(id: string) {
  return runServerEffect(deleteCvEffect(id));
}

/** Gives a CV the primary role (the PDF) or the website role (/curriculum). */
function markRoleEffect(id: string, role: "primary" | "website") {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* markCvEffect(id, role === "primary" ? "isPrimary" : "isWebsite");

    const request = yield* currentRequestEffect();

    yield* revalidatePathsEffect(
      request,
      publicPaths({ primary: role === "primary", website: role === "website" }),
    );
  });
}

/** Gives a CV the primary role (the PDF) or the website role (/curriculum). */
function markRole(id: string, role: "primary" | "website") {
  return runServerEffect(markRoleEffect(id, role));
}

/** A CV's printed content, with trial layout steps when given. */
function printForDeskEffect(id: string, layout: CvLayout | undefined) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const stored = yield* requireCvEffect(id);
    const cv = yield* printStoredCvEffect(stored);

    return layout === undefined ? cv : { ...cv, layout };
  });
}

/** A CV's printed content, with trial layout steps when given. */
function printForDesk(id: string, layout: CvLayout | undefined) {
  return runServerEffect(printForDeskEffect(id, layout));
}

/**
 * The primary CV is read from the public PDF, so this reads the cached
 * file that visitors download and only runs Chrome when that cache is cold.
 * Other CVs are private and rendered for the request.
 */
function cvPdfEffect(
  request: Request,
  id: string,
  primaryId: string,
): Effect.Effect<Uint8Array, PdfRenderError | BadGatewayError> {
  return Effect.gen(function* () {
    if (id !== primaryId) {
      return yield* renderPdfEffect(request, paths.desk["cv-print"](id)(), true);
    }

    const url = new URL(CV_PDF_PATH, request.url);
    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (cause) =>
        new BadGatewayError({
          message: "The PDF route could not be reached.",
          cause,
        }),
    });

    // Errors carry their cause to the desk, which shows it: the PDF route runs
    // Chrome on Vercel, and its failures are otherwise only in the function logs.
    if (!response.ok) {
      return yield* new BadGatewayError({
        message: `The PDF route answered ${response.status} ${response.statusText}.`,
      });
    }

    const buffer = yield* Effect.tryPromise({
      try: () => response.arrayBuffer(),
      catch: (cause) =>
        new BadGatewayError({
          message: "Reading the PDF response failed.",
          cause,
        }),
    });

    return new Uint8Array(buffer);
  });
}

/** The pages of a CV printed with trial steps; never stored. */
function trialPagesEffect(request: Request, id: string, layout: CvLayout) {
  return Effect.gen(function* () {
    const path = paths.desk["cv-print"](id, layoutQuery(layout));
    const pdf = yield* renderPdfEffect(request, path, true);

    return yield* pageFillsEffect(pdf, points(CV_LAYOUT_STEPS.margin[layout.margin]));
  });
}

/**
 * The pages of a CV with its stored steps; the result is stored with it.
 * Checks no session: the caller does, and `request` carries the one Chrome uses.
 */
function storedPagesEffect(
  request: Request,
  cv: { id: string; layout: CvLayout },
  primaryId: string,
) {
  return Effect.gen(function* () {
    const margin = points(CV_LAYOUT_STEPS.margin[cv.layout.margin]);
    const pdf = yield* cvPdfEffect(request, cv.id, primaryId);
    const pages = yield* pageFillsEffect(pdf, margin);

    yield* storePageFillsEffect(
      cv.id,
      pages.map((page) => page.fill),
    );

    return pages;
  });
}

/**
 * The pages of a CV with its stored steps; the result is stored with it.
 * Checks no session: the caller does, and `request` carries the one Chrome uses.
 */
function storedPages(request: Request, cv: { id: string; layout: CvLayout }, primaryId: string) {
  return runServerEffect(storedPagesEffect(request, cv, primaryId));
}

/**
 * How full each page of a CV's PDF is. Steps that differ from the
 * stored ones are a trial: printed with them, shown, never stored. Otherwise
 * the result is stored with the CV for the overview.
 */
function checkPagesEffect(id: string, trial: CvLayout | undefined) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const request = yield* currentRequestEffect();
    const { cvs, primaryId } = yield* listCvsEffect();
    const cv = cvs.find((candidate) => candidate.id === id);

    if (cv === undefined) {
      return yield* new NotFoundError({ message: `No CV "${id}".` });
    }

    if (trial !== undefined && !sameLayout(trial, cv.layout)) {
      return { pages: yield* trialPagesEffect(request, cv.id, trial), trial: true };
    }

    return { pages: yield* storedPagesEffect(request, cv, primaryId), trial: false };
  });
}

/**
 * How full each page of a CV's PDF is. Steps that differ from the
 * stored ones are a trial: printed with them, shown, never stored. Otherwise
 * the result is stored with the CV for the overview.
 */
function checkPages(id: string, trial: CvLayout | undefined) {
  return runServerEffect(checkPagesEffect(id, trial));
}

export {
  checkPages,
  checkPagesEffect,
  deleteCv,
  deleteCvEffect,
  markRole,
  markRoleEffect,
  printForDesk,
  printForDeskEffect,
  saveCv,
  saveCvEffect,
  storedPages,
  storedPagesEffect,
};
