import "server-only";
import type { EntryRecord, Profile, SkillGroupRecord } from "../data/cv";
import { array, literal, object, optional } from "zod/mini";
import {
  emptyOrMatching,
  matching,
  parseInput,
  requireSlug,
  requireUnique,
  stringList,
  text,
  trimmed,
} from "./input";

// Bullet and skill group ids, e.g. "agent-platform" or "backend_api".
const KEY = /^[a-z0-9][a-z0-9_-]*$/u;
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

const NOT_ENTRY = "Not a CV entry.";
const NEEDS_TITLE = "An entry needs a title and an organization.";
const DATES = 'Dates are months like "2023-10"; an empty end means ongoing.';
const BULLET = "Every bullet needs an id and some text.";
const LINK = "Every link needs a text and an address.";

const bulletSchema = object({ id: matching(KEY, BULLET), text: text(BULLET) }, BULLET);

const timelineLinkSchema = object({ text: text(LINK), href: text(LINK) }, LINK);

// Keys in the order the checks report problems.
const entrySchema = object(
  {
    section: literal(["experience", "education"], "Section must be experience or education."),
    title: text(NEEDS_TITLE),
    organization: text(NEEDS_TITLE),
    from: matching(MONTH, DATES),
    to: emptyOrMatching(MONTH, DATES),
    location: trimmed(NOT_ENTRY),
    tech: stringList(NOT_ENTRY),
    // A tab opened before names existed sends none: it falls back to the organization.
    name: optional(text("An entry needs a name.")),
    note: optional(trimmed(NOT_ENTRY)),
    bullets: array(bulletSchema, "Bullets must be a list."),
    links: array(timelineLinkSchema, "Links must be a list."),
  },
  NOT_ENTRY,
);

const SKILL_GROUP = "Every skill group needs an id and a title.";

const skillGroupSchema = object(
  {
    label: matching(KEY, SKILL_GROUP),
    title: text(SKILL_GROUP),
    name: optional(text("Every skill group needs a name.")),
    note: optional(trimmed(SKILL_GROUP)),
    items: stringList("Skills must be a list."),
  },
  SKILL_GROUP,
);

const skillGroupsSchema = array(skillGroupSchema, "Skill groups must be a list.");

const NOT_PROFILE = "Not a profile.";
const PROFILE_LINK = "Every link needs a label and an address.";

const profileLinkSchema = object(
  { label: text(PROFILE_LINK), href: text(PROFILE_LINK) },
  PROFILE_LINK,
);

const profileSchema = object(
  {
    name: text("The profile needs a name."),
    role: trimmed(NOT_PROFILE),
    location: trimmed(NOT_PROFILE),
    email: trimmed(NOT_PROFILE),
    phone: trimmed(NOT_PROFILE),
    links: array(profileLinkSchema, "Links must be a list."),
  },
  NOT_PROFILE,
);

/** Checks a timeline entry sent by the desk; the route's id wins. */
function parseEntryBody(id: string, body: unknown): EntryRecord {
  requireSlug(id);

  const entry = parseInput(entrySchema, body ?? {});

  requireUnique(
    entry.bullets.map((bullet) => bullet.id),
    "bullet",
  );

  return {
    id,
    section: entry.section,
    name: entry.name ?? entry.organization,
    note: entry.note ?? "",
    title: entry.title,
    organization: entry.organization,
    location: entry.location,
    from: entry.from,
    to: entry.to,
    tech: entry.tech,
    bullets: entry.bullets,
    links: entry.links,
  };
}

/** Checks the full, ordered list of skill groups sent by the desk. */
function parseSkillGroupsBody(body: unknown): SkillGroupRecord[] {
  const groups = parseInput(skillGroupsSchema, body).map((group) => ({
    label: group.label,
    name: group.name ?? group.title,
    note: group.note ?? "",
    title: group.title,
    items: group.items,
  }));

  requireUnique(
    groups.map((group) => group.label),
    "skill group",
  );

  return groups;
}

/** Checks the profile sent by the desk. */
function parseProfileBody(body: unknown): Profile {
  return parseInput(profileSchema, body ?? {});
}

export { parseEntryBody, parseProfileBody, parseSkillGroupsBody };
