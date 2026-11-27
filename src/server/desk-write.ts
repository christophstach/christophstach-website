import "server-only";
import { Effect } from "effect";
import { allPublicPaths, publicPaths } from "./cv-public-paths";
import {
  deleteEntryEffect as deleteStoredEntryEffect,
  requireEntryEffect,
  saveEntryEffect as saveStoredEntryEffect,
  saveProfileEffect as saveStoredProfileEffect,
  saveSkillGroupsEffect as saveStoredSkillGroupsEffect,
} from "./cv-content";
import {
  deleteProjectEffect as deleteStoredProjectEffect,
  requireProjectEffect,
  saveProjectEffect as saveStoredProjectEffect,
} from "./projects";
import {
  parseEntryBodyEffect,
  parseProfileBodyEffect,
  parseSkillGroupsBodyEffect,
} from "./cv-content-body";
import { ConfigError, runServerEffect, toHttpError } from "./effect";
import { getRequestEvent } from "@solidjs/web";
import { parseProjectBodyEffect } from "./project-body";
import { requireUserEffect } from "./auth";
import { revalidatePathsEffect } from "./cv-pdf";

// The desk's CV content writes. Each checks the session, parses its input
// (a server function's arguments come from outside like a request body) and
// renews the cached public responses the change can reach.

function currentRequestEffect(): Effect.Effect<Request, ConfigError> {
  return Effect.gen(function* () {
    const event = getRequestEvent();

    if (event === undefined) {
      return yield* new ConfigError({ message: "No request." });
    }

    return event.request;
  });
}

function currentRequest(): Request {
  const event = getRequestEvent();

  if (event === undefined) {
    throw toHttpError(new ConfigError({ message: "No request." }));
  }

  return event.request;
}

function entryEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* requireEntryEffect(id);
  });
}

function entry(id: string) {
  return runServerEffect(entryEffect(id));
}

function saveEntryEffect(id: string, body: unknown, { create }: { create: boolean }) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const parsed = yield* parseEntryBodyEffect(id, body);

    yield* saveStoredEntryEffect(parsed, { create });

    const request = yield* currentRequestEffect();

    yield* revalidatePathsEffect(request, allPublicPaths());

    return parsed;
  });
}

function saveEntry(id: string, body: unknown, options: { create: boolean }) {
  return runServerEffect(saveEntryEffect(id, body, options));
}

function deleteEntryEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deleteStoredEntryEffect(id);

    const request = yield* currentRequestEffect();

    yield* revalidatePathsEffect(request, allPublicPaths());
  });
}

function deleteEntry(id: string) {
  return runServerEffect(deleteEntryEffect(id));
}

function saveSkillGroupsEffect(body: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const groups = yield* parseSkillGroupsBodyEffect(body);

    yield* saveStoredSkillGroupsEffect(groups);

    const request = yield* currentRequestEffect();

    yield* revalidatePathsEffect(request, allPublicPaths());

    return groups;
  });
}

function saveSkillGroups(body: unknown) {
  return runServerEffect(saveSkillGroupsEffect(body));
}

function saveProfileEffect(body: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const profile = yield* parseProfileBodyEffect(body);

    yield* saveStoredProfileEffect(profile);

    const request = yield* currentRequestEffect();

    yield* revalidatePathsEffect(request, publicPaths({ primary: true, website: false }));

    return profile;
  });
}

function saveProfile(body: unknown) {
  return runServerEffect(saveProfileEffect(body));
}

function projectEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* requireProjectEffect(id);
  });
}

function project(id: string) {
  return runServerEffect(projectEffect(id));
}

function saveProjectEffect(id: string, body: unknown, { create }: { create: boolean }) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const parsed = yield* parseProjectBodyEffect(id, body);

    yield* saveStoredProjectEffect(parsed, { create });

    // A new project isn't picked by any CV yet, so nothing public changes.
    if (!create) {
      const request = yield* currentRequestEffect();

      yield* revalidatePathsEffect(request, publicPaths({ primary: true, website: true }));
    }

    return parsed;
  });
}

function saveProject(id: string, body: unknown, options: { create: boolean }) {
  return runServerEffect(saveProjectEffect(id, body, options));
}

function deleteProjectEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deleteStoredProjectEffect(id);

    const request = yield* currentRequestEffect();

    yield* revalidatePathsEffect(request, publicPaths({ primary: true, website: true }));
  });
}

function deleteProject(id: string) {
  return runServerEffect(deleteProjectEffect(id));
}

export {
  currentRequest,
  currentRequestEffect,
  deleteEntry,
  deleteEntryEffect,
  deleteProject,
  deleteProjectEffect,
  entry,
  entryEffect,
  project,
  projectEffect,
  saveEntry,
  saveEntryEffect,
  saveProfile,
  saveProfileEffect,
  saveProject,
  saveProjectEffect,
  saveSkillGroups,
  saveSkillGroupsEffect,
};
