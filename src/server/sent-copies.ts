import "server-only";
import { applications, coverLetters } from "../../server/db/schema";
import { eq } from "drizzle-orm";
import { printStoredCv, requireCv } from "./cvs";
import { HttpError } from "./http";
import type { SentCopy } from "../data/sent-copy";
import { findApplication } from "./applications";
import { printCoverLetter } from "./cover-letters";
import { readSentCopy } from "../data/sent-copy";
import { useDb } from "./db";

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
async function markSent(id: string) {
  const application = await findApplication(id);

  if (application === undefined) {
    throw new HttpError(404, `No application "${id}".`);
  }

  const cv = application.cvId === "" ? undefined : await requireCv(application.cvId);
  // At most one; kept as a list in the copy.
  const letters = await useDb()
    .select({ id: coverLetters.id, label: coverLetters.label })
    .from(coverLetters)
    .where(eq(coverLetters.applicationId, id));
  const copy: SentCopy = {
    sentAt: new Date().toISOString(),
    cv: cv === undefined ? null : await printStoredCv(cv),
    letters: await Promise.all(
      letters.map(async (letter) => ({ ...letter, letter: await printCoverLetter(letter.id) })),
    ),
  };
  const sentWith = [
    cv === undefined ? "" : `the CV "${cv.label}"`,
    letters.length === 0 ? "" : "its cover letter",
  ].filter((part) => part !== "");
  const today = todayUtc();

  await useDb()
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
    .where(eq(applications.id, id));
}

/** The stored copy of what the application sent; a 404 if there is none it can render. */
async function requireSentCopy(id: string): Promise<SentCopy> {
  const [row] = await useDb()
    .select({ sent: applications.sent })
    .from(applications)
    .where(eq(applications.id, id));
  const copy = row === undefined ? undefined : readSentCopy(row.sent);

  if (copy === undefined) {
    throw new HttpError(404, `Application "${id}" has no sent copy the desk can show.`);
  }

  return copy;
}

export { markSent, requireSentCopy };
