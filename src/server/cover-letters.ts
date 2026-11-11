import "server-only";
import type { CoverLetter, CoverLetterRecord, PrintedCoverLetter } from "../data/cover-letters";
import { applications, coverLetters } from "../../server/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { currentBuild, requireCv } from "./cvs";
import { HttpError } from "./http";
import { findApplication } from "./applications";
import { loadProfile } from "./cv-content";
import { printedLetter } from "../lib/cover-letter";
import { useDb } from "./db";

type LetterRow = typeof coverLetters.$inferSelect;

function toLetter(row: LetterRow): CoverLetter {
  return {
    id: row.id,
    label: row.label,
    note: row.note,
    applicationId: row.applicationId,
    recipient: row.recipient,
    language: row.language,
    letterDate: row.letterDate,
    subject: row.subject,
    salutation: row.salutation,
    body: row.body,
    closing: row.closing,
  };
}

function notFound(id: string) {
  return new HttpError(404, `No cover letter "${id}".`);
}

/** All cover letters, newest first, each with its page check on this build and its job. */
async function listCoverLetters(): Promise<CoverLetterRecord[]> {
  const build = currentBuild();
  const rows = await useDb()
    .select({
      letter: coverLetters,
      company: applications.company,
      jobTitle: applications.jobTitle,
    })
    .from(coverLetters)
    .innerJoin(applications, eq(coverLetters.applicationId, applications.id))
    .orderBy(desc(coverLetters.createdAt), asc(coverLetters.id));

  return rows.map(({ letter, company, jobTitle }) =>
    Object.assign(toLetter(letter), {
      pageFills: letter.pageFillsBuild === build ? letter.pageFills : [],
      application: { company, jobTitle },
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

function letterColumns(letter: CoverLetter) {
  // A saved letter has to be measured again.
  return { ...letter, pageFills: [], pageFillsBuild: "", updatedAt: new Date() };
}

/** Creates a cover letter (409 if the id is taken) or updates one (404 if missing). */
async function saveCoverLetter(letter: CoverLetter, { create }: { create: boolean }) {
  if ((await findApplication(letter.applicationId)) === undefined) {
    throw new HttpError(400, `No application "${letter.applicationId}".`);
  }

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
    throw create ? new HttpError(409, `Cover letter "${letter.id}" exists.`) : notFound(letter.id);
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

/** What the print page shows; the role is that of the application's CV. */
async function printCoverLetter(id: string): Promise<PrintedCoverLetter> {
  const letter = await requireCoverLetter(id);
  const [profile, application] = await Promise.all([
    loadProfile(),
    findApplication(letter.applicationId),
  ]);
  const cvId = application?.cvId ?? "";
  const cv = cvId === "" ? undefined : await requireCv(cvId);

  return printedLetter(letter, profile, cv?.role);
}

export {
  deleteCoverLetter,
  listCoverLetters,
  printCoverLetter,
  requireCoverLetter,
  saveCoverLetter,
  storeCoverLetterFills,
};
