import "server-only";
import { deleteApplication, findApplication, saveApplication } from "./applications";
import { matching, parseInput } from "./input";
import { literal, object } from "zod/mini";
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

const settleSchema = object(
  {
    action: literal(["done", "later"], "Not a next-step action."),
    today: matching(ISO_DATE, "Not a day."),
  },
  "Not a next-step action.",
);

/** How many days "later" moves a next step on. */
const LATER_DAYS = 3;

/** The ISO day `days` after an ISO day. */
function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/** An event id of the form "event-N" that the history doesn't have yet. */
function freeEventId(events: { id: string }[]): string {
  const taken = new Set(events.map((event) => event.id));
  let number = events.length + 1;

  while (taken.has(`event-${number}`)) {
    number += 1;
  }

  return `event-${number}`;
}

/**
 * Settles an application's next step from the overview: "done" writes it into
 * the history (dated `today`, the browser's day) and clears it; "later" moves
 * it three days past today.
 */
async function settleDeskNextStep(id: string, body: unknown) {
  await requireUser();

  const { action, today } = parseInput(settleSchema, body);
  const application = await findApplication(id);

  if (application === undefined) {
    throw new HttpError(404, `No application "${id}".`);
  }

  if (action === "later") {
    application.nextStepOn = addDays(today, LATER_DAYS);
  } else {
    application.events.push({
      id: freeEventId(application.events),
      date: today,
      text: application.nextStep || "Next step done",
    });
    application.nextStep = "";
    application.nextStepOn = "";
  }

  await saveApplication(application, { create: false });
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

export {
  deleteDeskApplication,
  markDeskApplicationSent,
  saveDeskApplication,
  sentCv,
  sentLetter,
  settleDeskNextStep,
};
