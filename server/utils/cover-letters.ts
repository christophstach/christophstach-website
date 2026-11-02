import type {
  CoverLetter,
  CoverLetterRecord,
  PrintedCoverLetter,
} from "../../app/data/cover-letters";
import { asc, desc, eq } from "drizzle-orm";
import { coverLetters, cvVariants } from "../db/schema";
import { currentBuild, requireVariant } from "./cv-variants";
import { createError } from "h3";
import { loadProfile } from "./cv-content";
import { printedLetter } from "../../app/utils/cover-letter";
import { useDb } from "./db";

type LetterRow = typeof coverLetters.$inferSelect;

function toLetter(row: LetterRow): CoverLetter {
  return {
    id: row.id,
    label: row.label,
    note: row.note,
    variantId: row.variantId ?? "",
    company: row.company,
    recipient: row.recipient,
    jobTitle: row.jobTitle,
    jobUrl: row.jobUrl,
    jobDescription: row.jobDescription,
    language: row.language,
    letterDate: row.letterDate,
    subject: row.subject,
    salutation: row.salutation,
    body: row.body,
    closing: row.closing,
  };
}

function notFound(id: string) {
  return createError({ statusCode: 404, message: `No cover letter "${id}".` });
}

/** All cover letters, newest first, each with its page check on this build. */
async function listCoverLetters(): Promise<CoverLetterRecord[]> {
  const build = currentBuild();
  const rows = await useDb()
    .select()
    .from(coverLetters)
    .orderBy(desc(coverLetters.createdAt), asc(coverLetters.id));

  return rows.map((row) =>
    Object.assign(toLetter(row), {
      pageFills: row.pageFillsBuild === build ? row.pageFills : [],
    }),
  );
}

/** The cover letter with this id; a 404 error if there is none. */
async function requireCoverLetter(id: string): Promise<CoverLetter> {
  const [row] = await useDb().select().from(coverLetters).where(eq(coverLetters.id, id));

  if (!row) {
    throw notFound(id);
  }

  return toLetter(row);
}

async function requireLinkedVariant(variantId: string) {
  if (!variantId) {
    return;
  }

  const [row] = await useDb()
    .select({ id: cvVariants.id })
    .from(cvVariants)
    .where(eq(cvVariants.id, variantId));

  if (!row) {
    throw createError({ statusCode: 400, message: `No CV variant "${variantId}".` });
  }
}

function letterColumns(letter: CoverLetter) {
  // A saved letter has to be measured again.
  return {
    ...letter,
    // oxlint-disable-next-line unicorn/no-null -- the foreign key's "none"
    variantId: letter.variantId || null,
    pageFills: [],
    pageFillsBuild: "",
    updatedAt: new Date(),
  };
}

/** Creates a cover letter (409 if the id is taken) or updates one (404 if missing). */
async function saveCoverLetter(letter: CoverLetter, { create }: { create: boolean }) {
  await requireLinkedVariant(letter.variantId);

  const written = create
    ? await useDb()
        .insert(coverLetters)
        .values(letterColumns(letter))
        .onConflictDoNothing()
        .returning({ id: coverLetters.id })
    : await useDb()
        .update(coverLetters)
        .set(letterColumns(letter))
        .where(eq(coverLetters.id, letter.id))
        .returning({ id: coverLetters.id });

  if (written.length === 0) {
    throw create
      ? createError({ statusCode: 409, message: `Cover letter "${letter.id}" exists.` })
      : notFound(letter.id);
  }
}

async function deleteCoverLetter(id: string) {
  const deleted = await useDb()
    .delete(coverLetters)
    .where(eq(coverLetters.id, id))
    .returning({ id: coverLetters.id });

  if (deleted.length === 0) {
    throw notFound(id);
  }
}

/** Stores how full each page was, marked with the build that printed it. */
async function storeCoverLetterFills(id: string, fills: number[]) {
  await useDb()
    .update(coverLetters)
    .set({ pageFills: fills, pageFillsBuild: currentBuild() })
    .where(eq(coverLetters.id, id));
}

/** What the print page shows. */
async function printCoverLetter(id: string): Promise<PrintedCoverLetter> {
  const letter = await requireCoverLetter(id);
  const [profile, variant] = await Promise.all([
    loadProfile(),
    letter.variantId ? requireVariant(letter.variantId) : undefined,
  ]);

  return printedLetter(letter, profile, variant?.role);
}

export {
  deleteCoverLetter,
  listCoverLetters,
  printCoverLetter,
  requireCoverLetter,
  saveCoverLetter,
  storeCoverLetterFills,
};
