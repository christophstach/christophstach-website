import "server-only";
import type { Application, ApplicationRecord, SentSummary } from "../data/applications";
import { applications, coverLetters } from "../../server/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { HttpError } from "./http";
import { readSentCopy } from "../data/sent-copy";
import { reopenPosting } from "./postings";
import { requireLinkedCv } from "./cvs";
import { useDb } from "./db";

type ApplicationRow = typeof applications.$inferSelect;

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    jobTitle: row.jobTitle,
    jobUrl: row.jobUrl,
    jobDescription: row.jobDescription,
    location: row.location,
    source: row.source,
    status: row.status,
    cvId: row.cvId ?? "",
    appliedOn: row.appliedOn,
    nextStep: row.nextStep,
    nextStepOn: row.nextStepOn,
    contacts: row.contacts,
    events: row.events,
    note: row.note,
  };
}

function notFound(id: string) {
  return new HttpError(404, `No application "${id}".`);
}

/** What the desk shows of a stored copy; null if there is none. */
function sentSummary(value: unknown): SentSummary | null {
  if (value === null) {
    return null;
  }

  const copy = readSentCopy(value);

  return copy === undefined
    ? { sentAt: "", hasCv: false, letters: [] }
    : {
        sentAt: copy.sentAt,
        hasCv: copy.cv !== null,
        letters: copy.letters.map(({ id, label }) => ({ id, label })),
      };
}

/** All applications, newest first, each with its cover letter. */
async function listApplications(): Promise<ApplicationRecord[]> {
  const [rows, letters] = await Promise.all([
    useDb().select().from(applications).orderBy(desc(applications.createdAt), asc(applications.id)),
    useDb()
      .select({
        id: coverLetters.id,
        label: coverLetters.label,
        applicationId: coverLetters.applicationId,
      })
      .from(coverLetters),
  ]);

  return rows.map((row) =>
    Object.assign(toApplication(row), {
      letter:
        letters
          .filter((letter) => letter.applicationId === row.id)
          .map(({ id, label }) => ({ id, label }))[0] ?? null,
      postingId: row.postingId ?? "",
      sent: sentSummary(row.sent),
      updatedAt: row.updatedAt.toISOString(),
    }),
  );
}

/** The application with this id; undefined if there is none. */
async function findApplication(id: string): Promise<Application | undefined> {
  const [row] = await useDb().select().from(applications).where(eq(applications.id, id));

  return row === undefined ? undefined : toApplication(row);
}

function applicationColumns(application: Application) {
  return { ...application, cvId: application.cvId || null, updatedAt: new Date() };
}

/** Creates an application (409 if the id is taken) or updates one (404 if missing). */
async function saveApplication(application: Application, { create }: { create: boolean }) {
  await requireLinkedCv(application.cvId);

  const written = create
    ? await useDb()
        .insert(applications)
        .values(applicationColumns(application))
        .onConflictDoNothing()
        .returning({ id: applications.id })
    : await useDb()
        .update(applications)
        .set(applicationColumns(application))
        .where(eq(applications.id, application.id))
        .returning({ id: applications.id });

  if (written.length === 0) {
    throw create
      ? new HttpError(409, `Application "${application.id}" exists.`)
      : notFound(application.id);
  }
}

/**
 * Deletes an application and, with it, its cover letter. The posting it was
 * made from goes back among the interesting ones.
 */
async function deleteApplication(id: string) {
  const deleted = await useDb()
    .delete(applications)
    .where(eq(applications.id, id))
    .returning({ id: applications.id, postingId: applications.postingId });

  if (deleted[0] === undefined) {
    throw notFound(id);
  }

  if (deleted[0].postingId !== null) {
    await reopenPosting(deleted[0].postingId);
  }
}

/** Every application's id. */
async function applicationIds(): Promise<string[]> {
  const rows = await useDb().select({ id: applications.id }).from(applications);

  return rows.map((row) => row.id);
}

/** Notes the posting an application was made from. */
async function linkPosting(id: string, postingId: string) {
  await useDb().update(applications).set({ postingId }).where(eq(applications.id, id));
}

export {
  applicationIds,
  deleteApplication,
  findApplication,
  linkPosting,
  listApplications,
  saveApplication,
};
