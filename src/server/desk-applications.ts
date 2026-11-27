import "server-only";
import { Effect, Schema } from "effect";
import {
  deleteApplicationEffect,
  findApplicationEffect,
  saveApplicationEffect,
} from "./applications";
import { decodeBodyEffect, isoDateSchema } from "./input";
import { markSentEffect, requireSentCopyEffect } from "./sent-copies";
import { NotFoundError, runServerEffect } from "./effect";
import { parseApplicationBodyEffect } from "./application-body";
import { requireUserEffect } from "./auth";

// The desk's application writes. Each checks the session first and parses
// its input. Applications are private: no public page to renew.

function saveDeskApplicationEffect(id: string, body: unknown, { create }: { create: boolean }) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const application = yield* parseApplicationBodyEffect(id, body);

    yield* saveApplicationEffect(application, { create });

    return application;
  });
}

function saveDeskApplication(id: string, body: unknown, options: { create: boolean }) {
  return runServerEffect(saveDeskApplicationEffect(id, body, options));
}

function deleteDeskApplicationEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deleteApplicationEffect(id);
  });
}

function deleteDeskApplication(id: string) {
  return runServerEffect(deleteDeskApplicationEffect(id));
}

function markDeskApplicationSentEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* markSentEffect(id);
  });
}

function markDeskApplicationSent(id: string) {
  return runServerEffect(markDeskApplicationSentEffect(id));
}

const SettleNextStepSchema = Schema.Struct({
  action: Schema.Literals(["done", "later"]).annotate({
    message: "Not a next-step action.",
  }),
  today: isoDateSchema("Not a day."),
}).annotate({ message: "Not a next-step action." });

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
function settleDeskNextStepEffect(id: string, body: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const { action, today } = yield* decodeBodyEffect(SettleNextStepSchema, body);
    const application = yield* findApplicationEffect(id);

    if (application === undefined) {
      return yield* new NotFoundError({ message: `No application "${id}".` });
    }

    const updated =
      action === "later"
        ? { ...application, nextStepOn: addDays(today, LATER_DAYS) }
        : {
            ...application,
            events: [
              ...application.events,
              {
                id: freeEventId(application.events),
                date: today,
                text: application.nextStep || "Next step done",
              },
            ],
            nextStep: "",
            nextStepOn: "",
          };

    return yield* saveApplicationEffect(updated, { create: false });
  });
}

/**
 * Settles an application's next step from the overview: "done" writes it into
 * the history (dated `today`, the browser's day) and clears it; "later" moves
 * it three days past today.
 */
function settleDeskNextStep(id: string, body: unknown) {
  return runServerEffect(settleDeskNextStepEffect(id, body));
}

/** The CV the application sent, as it printed then. */
function sentCvEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const { cv } = yield* requireSentCopyEffect(id);

    if (cv === null) {
      return yield* new NotFoundError({ message: `Application "${id}" sent no CV.` });
    }

    return cv;
  });
}

/** The CV the application sent, as it printed then. */
function sentCv(id: string) {
  return runServerEffect(sentCvEffect(id));
}

/** A cover letter the application sent, as it printed then. */
function sentLetterEffect(id: string, letterId: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const copy = yield* requireSentCopyEffect(id);
    const sent = copy.letters.find((letter) => letter.id === letterId);

    if (sent === undefined) {
      return yield* new NotFoundError({
        message: `Application "${id}" sent no cover letter "${letterId}".`,
      });
    }

    return sent.letter;
  });
}

/** A cover letter the application sent, as it printed then. */
function sentLetter(id: string, letterId: string) {
  return runServerEffect(sentLetterEffect(id, letterId));
}

export {
  SettleNextStepSchema,
  deleteDeskApplication,
  deleteDeskApplicationEffect,
  markDeskApplicationSent,
  markDeskApplicationSentEffect,
  saveDeskApplication,
  saveDeskApplicationEffect,
  sentCv,
  sentCvEffect,
  sentLetter,
  sentLetterEffect,
  settleDeskNextStep,
  settleDeskNextStepEffect,
};
