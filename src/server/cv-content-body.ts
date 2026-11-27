import "server-only";
import { Cause, Effect, Exit, Result, Schema } from "effect";
import type { EntryRecord, Profile, SkillGroupRecord } from "../data/cv";
import { type BadRequestError, toHttpError } from "./effect";
import {
  decodeBodyEffect,
  emptyOrMatchingSchema,
  matchingSchema,
  requireSlugEffect,
  requireUniqueEffect,
  stringListSchema,
  textSchema,
  trimmedSchema,
} from "./input";

// Bullet and skill group ids, e.g. "agent-platform" or "backend_api".
const KEY = /^[a-z0-9][a-z0-9_-]*$/u;
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

const NOT_ENTRY = "Not a CV entry.";
const NEEDS_TITLE = "An entry needs a title and an organization.";
const DATES = 'Dates are months like "2023-10"; an empty end means ongoing.';
const BULLET = "Every bullet needs an id and some text.";
const LINK = "Every link needs a text and an address.";

const BulletSchema = Schema.Struct({
  id: matchingSchema(KEY, BULLET),
  text: textSchema(BULLET),
}).annotate({ message: BULLET });

const TimelineLinkSchema = Schema.Struct({
  text: textSchema(LINK),
  href: textSchema(LINK),
}).annotate({ message: LINK });

// Keys in the order the checks report problems.
const EntryBodySchema = Schema.Struct({
  section: Schema.Literals(["experience", "education"]).annotate({
    message: "Section must be experience or education.",
  }),
  title: textSchema(NEEDS_TITLE),
  organization: textSchema(NEEDS_TITLE),
  from: matchingSchema(MONTH, DATES),
  to: emptyOrMatchingSchema(MONTH, DATES),
  location: trimmedSchema(NOT_ENTRY),
  tech: stringListSchema(NOT_ENTRY),
  // A tab opened before names existed sends none: it falls back to the organization.
  name: Schema.optionalKey(textSchema("An entry needs a name.")),
  note: Schema.optionalKey(trimmedSchema(NOT_ENTRY)),
  bullets: Schema.mutable(Schema.Array(BulletSchema)).annotate({
    message: "Bullets must be a list.",
  }),
  links: Schema.mutable(Schema.Array(TimelineLinkSchema)).annotate({
    message: "Links must be a list.",
  }),
})
  .annotate({ message: NOT_ENTRY })
  .pipe(
    Schema.check(
      Schema.makeFilter((entry) => entry.to === "" || entry.to >= entry.from, {
        message: "An entry can't end before it starts.",
      }),
    ),
  );

const SKILL_GROUP = "Every skill group needs an id and a title.";

const SkillGroupBodySchema = Schema.Struct({
  label: matchingSchema(KEY, SKILL_GROUP),
  title: textSchema(SKILL_GROUP),
  name: Schema.optionalKey(textSchema("Every skill group needs a name.")),
  note: Schema.optionalKey(trimmedSchema(SKILL_GROUP)),
  items: stringListSchema("Skills must be a list."),
}).annotate({ message: SKILL_GROUP });

const SkillGroupsBodySchema = Schema.mutable(Schema.Array(SkillGroupBodySchema)).annotate({
  message: "Skill groups must be a list.",
});

const NOT_PROFILE = "Not a profile.";
const PROFILE_LINK = "Every link needs a label and an address.";

const ProfileLinkSchema = Schema.Struct({
  label: textSchema(PROFILE_LINK),
  href: textSchema(PROFILE_LINK),
}).annotate({ message: PROFILE_LINK });

const ProfileBodySchema = Schema.Struct({
  name: textSchema("The profile needs a name."),
  role: trimmedSchema(NOT_PROFILE),
  location: trimmedSchema(NOT_PROFILE),
  email: trimmedSchema(NOT_PROFILE),
  phone: trimmedSchema(NOT_PROFILE),
  links: Schema.mutable(Schema.Array(ProfileLinkSchema)).annotate({
    message: "Links must be a list.",
  }),
}).annotate({ message: NOT_PROFILE });

function runSyncBody<A>(effect: Effect.Effect<A, BadRequestError>): A {
  const exit = Effect.runSyncExit(effect);

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findError(exit.cause);

  if (Result.isSuccess(failure)) {
    throw toHttpError(failure.success);
  }

  throw Cause.squash(exit.cause);
}

/** Checks a timeline entry sent by the desk; the route's id wins. */
function parseEntryBodyEffect(
  id: string,
  body: unknown,
): Effect.Effect<EntryRecord, BadRequestError> {
  return Effect.gen(function* () {
    yield* requireSlugEffect(id);

    const entry = yield* decodeBodyEffect(EntryBodySchema, body ?? {});

    yield* requireUniqueEffect(
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
      bullets: entry.bullets.map((bullet) => ({ id: bullet.id, text: bullet.text })),
      links: entry.links.map((link) => ({ text: link.text, href: link.href })),
    };
  });
}

/** Checks a timeline entry sent by the desk; the route's id wins. */
function parseEntryBody(id: string, body: unknown): EntryRecord {
  return runSyncBody(parseEntryBodyEffect(id, body));
}

/** Checks the full, ordered list of skill groups sent by the desk. */
function parseSkillGroupsBodyEffect(
  body: unknown,
): Effect.Effect<SkillGroupRecord[], BadRequestError> {
  return Effect.gen(function* () {
    const parsed = yield* decodeBodyEffect(SkillGroupsBodySchema, body);
    const groups: SkillGroupRecord[] = parsed.map((group) => ({
      label: group.label,
      name: group.name ?? group.title,
      note: group.note ?? "",
      title: group.title,
      items: group.items,
    }));

    yield* requireUniqueEffect(
      groups.map((group) => group.label),
      "skill group",
    );

    return groups;
  });
}

/** Checks the full, ordered list of skill groups sent by the desk. */
function parseSkillGroupsBody(body: unknown): SkillGroupRecord[] {
  return runSyncBody(parseSkillGroupsBodyEffect(body));
}

/** Checks the profile sent by the desk. */
function parseProfileBodyEffect(body: unknown): Effect.Effect<Profile, BadRequestError> {
  return Effect.map(decodeBodyEffect(ProfileBodySchema, body ?? {}), (profile) => ({
    name: profile.name,
    role: profile.role,
    location: profile.location,
    email: profile.email,
    phone: profile.phone,
    links: profile.links.map((link) => ({ label: link.label, href: link.href })),
  }));
}

/** Checks the profile sent by the desk. */
function parseProfileBody(body: unknown): Profile {
  return runSyncBody(parseProfileBodyEffect(body));
}

export {
  EntryBodySchema,
  ProfileBodySchema,
  SkillGroupsBodySchema,
  parseEntryBody,
  parseEntryBodyEffect,
  parseProfileBody,
  parseProfileBodyEffect,
  parseSkillGroupsBody,
  parseSkillGroupsBodyEffect,
};
