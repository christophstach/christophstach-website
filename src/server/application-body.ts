import "server-only";
import { APPLICATION_SOURCES, APPLICATION_STATUSES } from "../data/applications";
import { array, literal, object } from "zod/mini";
import {
  emptyOrMatching,
  matching,
  parseInput,
  requireSlug,
  requireUnique,
  text,
  trimmed,
} from "./input";
import type { Application } from "../data/applications";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const NOT_APPLICATION = "Not an application.";

const contactSchema = object(
  {
    id: text(NOT_APPLICATION),
    name: trimmed(NOT_APPLICATION),
    role: trimmed(NOT_APPLICATION),
    email: trimmed(NOT_APPLICATION),
    phone: trimmed(NOT_APPLICATION),
  },
  NOT_APPLICATION,
);

const eventSchema = object(
  {
    id: text(NOT_APPLICATION),
    date: matching(ISO_DATE, "Every history entry needs a date."),
    text: text("Every history entry needs a text."),
  },
  NOT_APPLICATION,
);

const applicationSchema = object(
  {
    company: text("The company can't be empty."),
    jobTitle: trimmed(NOT_APPLICATION),
    jobUrl: trimmed(NOT_APPLICATION),
    jobDescription: trimmed(NOT_APPLICATION),
    location: trimmed(NOT_APPLICATION),
    source: literal(APPLICATION_SOURCES, NOT_APPLICATION),
    status: literal(APPLICATION_STATUSES, NOT_APPLICATION),
    cvId: trimmed(NOT_APPLICATION),
    appliedOn: emptyOrMatching(ISO_DATE, NOT_APPLICATION),
    nextStep: trimmed(NOT_APPLICATION),
    nextStepOn: emptyOrMatching(ISO_DATE, NOT_APPLICATION),
    contacts: array(contactSchema, NOT_APPLICATION),
    events: array(eventSchema, NOT_APPLICATION),
    note: trimmed(NOT_APPLICATION),
  },
  NOT_APPLICATION,
);

/**
 * Checks the shape of an application sent by the desk; the route's id wins.
 * A contact without a name is dropped, the history is sorted by date.
 */
function parseApplicationBody(id: string, body: unknown): Application {
  requireSlug(id);

  const application = parseInput(applicationSchema, body ?? {});

  requireUnique(
    application.contacts.map((contact) => contact.id),
    "contact",
  );
  requireUnique(
    application.events.map((event) => event.id),
    "history entry",
  );

  return {
    id,
    ...application,
    contacts: application.contacts.filter((contact) => contact.name !== ""),
    events: application.events.toSorted((first, second) => first.date.localeCompare(second.date)),
  };
}

export { parseApplicationBody };
