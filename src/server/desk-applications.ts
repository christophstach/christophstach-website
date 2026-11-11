import "server-only";
import { deleteApplication, saveApplication } from "./applications";
import { markSent, requireSentCopy } from "./sent-copies";
import { HttpError } from "./http";
import { parseApplicationBody } from "./application-body";
import { requireUser } from "./auth";

// The desk's application writes. Each checks the session first and parses
// its input. Applications are private: no public page to renew.

async function saveDeskApplication(id: string, body: unknown, { create }: { create: boolean }) {
  await requireUser();

  const application = parseApplicationBody(id, body);

  await saveApplication(application, { create });

  return application;
}

async function deleteDeskApplication(id: string) {
  await requireUser();
  await deleteApplication(id);
}

async function markDeskApplicationSent(id: string) {
  await requireUser();
  await markSent(id);
}

/** The CV the application sent, as it printed then. */
async function sentCv(id: string) {
  await requireUser();

  const { cv } = await requireSentCopy(id);

  if (cv === null) {
    throw new HttpError(404, `Application "${id}" sent no CV.`);
  }

  return cv;
}

/** A cover letter the application sent, as it printed then. */
async function sentLetter(id: string, letterId: string) {
  await requireUser();

  const sent = (await requireSentCopy(id)).letters.find((letter) => letter.id === letterId);

  if (sent === undefined) {
    throw new HttpError(404, `Application "${id}" sent no cover letter "${letterId}".`);
  }

  return sent.letter;
}

export { deleteDeskApplication, markDeskApplicationSent, saveDeskApplication, sentCv, sentLetter };
