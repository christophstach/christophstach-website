import "server-only";
import { Effect } from "effect";
import {
  deleteCoverLetterEffect,
  printCoverLetterEffect,
  requireCoverLetterEffect,
  saveCoverLetterEffect,
  storeCoverLetterFillsEffect,
} from "./cover-letters";
import { pageFillsEffect, points } from "./pdf-pages";
import { COVER_LETTER_MARGIN_MM } from "../data/cover-letter-wording";
import { currentRequestEffect } from "./desk-write";
import { parseCoverLetterBodyEffect } from "./cover-letter-body";
import { paths } from "../router";
import { renderPdfEffect } from "./cv-pdf";
import { requireUserEffect } from "./auth";
import { runServerEffect } from "./effect";

// The desk's cover letter writes, prints and page checks. Each checks the
// session first and parses its input.

function saveLetterEffect(id: string, body: unknown, { create }: { create: boolean }) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const letter = yield* parseCoverLetterBodyEffect(id, body);

    yield* saveCoverLetterEffect(letter, { create });

    return letter;
  });
}

function saveLetter(id: string, body: unknown, options: { create: boolean }) {
  return runServerEffect(saveLetterEffect(id, body, options));
}

function deleteLetterEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deleteCoverLetterEffect(id);
  });
}

function deleteLetter(id: string) {
  return runServerEffect(deleteLetterEffect(id));
}

function printLetterEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* printCoverLetterEffect(id);
  });
}

function printLetter(id: string) {
  return runServerEffect(printLetterEffect(id));
}

/**
 * How full each page of the letter's PDF is; stored with the letter. Checks no
 * session: the caller does, and `request` carries the one Chrome uses.
 */
function letterPagesEffect(request: Request, id: string) {
  return Effect.gen(function* () {
    const letter = yield* requireCoverLetterEffect(id);
    const pdf = yield* renderPdfEffect(
      request,
      paths.desk["cover-letter-print"](letter.id)(),
      true,
    );
    const pages = yield* pageFillsEffect(pdf, points(COVER_LETTER_MARGIN_MM));

    yield* storeCoverLetterFillsEffect(
      letter.id,
      pages.map((page) => page.fill),
    );

    return pages;
  });
}

/**
 * How full each page of the letter's PDF is; stored with the letter. Checks no
 * session: the caller does, and `request` carries the one Chrome uses.
 */
function letterPages(request: Request, id: string) {
  return runServerEffect(letterPagesEffect(request, id));
}

/** How full each page of the letter's PDF is; stored with the letter. */
function checkLetterPagesEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const request = yield* currentRequestEffect();

    return { pages: yield* letterPagesEffect(request, id) };
  });
}

/** How full each page of the letter's PDF is; stored with the letter. */
function checkLetterPages(id: string) {
  return runServerEffect(checkLetterPagesEffect(id));
}

export {
  checkLetterPages,
  checkLetterPagesEffect,
  deleteLetter,
  deleteLetterEffect,
  letterPages,
  letterPagesEffect,
  printLetter,
  printLetterEffect,
  saveLetter,
  saveLetterEffect,
};
