import "server-only";
import { Effect } from "effect";
import { applications, coverLetters } from "../../server/db/schema";
import { eq } from "drizzle-orm";
import { printStoredCvEffect, requireCvEffect } from "./cvs";
import {
  type BadRequestError,
  type ConfigError,
  type Database,
  type DatabaseError,
  NotFoundError,
  dbQuery,
  runServerEffect,
} from "./effect";
import type { SentCopy } from "../data/sent-copy";
import { findApplicationEffect } from "./applications";
import { printCoverLetterEffect } from "./cover-letters";
import { readSentCopy } from "../data/sent-copy";

/** Today's date (UTC), e.g. "2026-11-12". */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** An id of the form "event-N" that no history entry has. */
function freeEventId(events: { id: string }[]): string {
  const taken = new Set(events.map((event) => event.id));
  let number = events.length + 1;

  while (taken.has(`event-${number}`)) {
    number += 1;
  }

  return `event-${number}`;
}

/**
 * Marks an application as sent: freezes its CV and cover letter as they
 * print now, moves a not-yet-sent one to "applied" (dated today unless it
 * has a date) and notes it in the history. Marking it again replaces the copy.
 */
function markSentEffect(
  id: string,
): Effect.Effect<void, BadRequestError | NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const application = yield* findApplicationEffect(id);

    if (application === undefined) {
      return yield* new NotFoundError({ message: `No application "${id}".` });
    }

    const cv = application.cvId === "" ? undefined : yield* requireCvEffect(application.cvId);
    // At most one; kept as a list in the copy.
    const letters = yield* dbQuery(
      (db) =>
        db
          .select({ id: coverLetters.id, label: coverLetters.label })
          .from(coverLetters)
          .where(eq(coverLetters.applicationId, id)),
      `Failed to load cover letters for application "${id}".`,
    );
    const [printedCv, printedLetters] = yield* Effect.all(
      [
        cv === undefined ? Effect.succeed(null) : printStoredCvEffect(cv),
        Effect.forEach(
          letters,
          (letter) =>
            printCoverLetterEffect(letter.id).pipe(
              Effect.map((printed) => ({ ...letter, letter: printed })),
            ),
          { concurrency: "unbounded" },
        ),
      ],
      { concurrency: "unbounded" },
    );
    const copy: SentCopy = {
      sentAt: new Date().toISOString(),
      cv: printedCv,
      letters: printedLetters,
    };
    const sentWith = [
      cv === undefined ? "" : `the CV "${cv.label}"`,
      letters.length === 0 ? "" : "its cover letter",
    ].filter((part) => part !== "");
    const today = todayUtc();

    yield* dbQuery(
      (db) =>
        db
          .update(applications)
          .set({
            sent: copy,
            status: "applied",
            appliedOn: application.appliedOn === "" ? today : application.appliedOn,
            events: [
              ...application.events,
              {
                id: freeEventId(application.events),
                date: today,
                text: sentWith.length === 0 ? "Sent." : `Sent with ${sentWith.join(" and ")}.`,
              },
            ],
            updatedAt: new Date(),
          })
          .where(eq(applications.id, id)),
      `Failed to mark application "${id}" as sent.`,
    );

    return undefined;
  });
}

/**
 * Marks an application as sent: freezes its CV and cover letter as they
 * print now, moves a not-yet-sent one to "applied" (dated today unless it
 * has a date) and notes it in the history. Marking it again replaces the copy.
 */
function markSent(id: string): Promise<void> {
  return runServerEffect(markSentEffect(id));
}

/** The stored copy of what the application sent; a 404 if there is none it can render. */
function requireSentCopyEffect(
  id: string,
): Effect.Effect<SentCopy, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) =>
        db.select({ sent: applications.sent }).from(applications).where(eq(applications.id, id)),
      `Failed to load sent copy for application "${id}".`,
    );
    const copy = row === undefined ? undefined : readSentCopy(row.sent);

    if (copy === undefined) {
      return yield* new NotFoundError({
        message: `Application "${id}" has no sent copy the desk can show.`,
      });
    }

    return copy;
  });
}

/** The stored copy of what the application sent; a 404 if there is none it can render. */
function requireSentCopy(id: string): Promise<SentCopy> {
  return runServerEffect(requireSentCopyEffect(id));
}

export { markSent, markSentEffect, requireSentCopy, requireSentCopyEffect };
