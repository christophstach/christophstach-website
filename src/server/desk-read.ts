import "server-only";
import { Effect } from "effect";
import { listEntriesEffect, listSkillGroupsEffect, loadProfileEffect } from "./cv-content";
import { DatabaseError, runServerEffect } from "./effect";
import { HttpError } from "./http";
import { listApplicationsEffect } from "./applications";
import { listCollectors } from "./collector-store";
import { listCompaniesEffect } from "./companies";
import { listCoverLettersEffect } from "./cover-letters";
import { listCvsEffect } from "./cvs";
import { listPostingsEffect } from "./postings";
import { listProjectsEffect } from "./projects";
import { requireUserEffect } from "./auth";

// The desk's reads. Each checks the session first: the page guard doesn't
// cover server functions, which anyone can call.

function deskCvsEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* listCvsEffect();
  });
}

function deskCvs() {
  return runServerEffect(deskCvsEffect());
}

function deskApplicationsEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* listApplicationsEffect();
  });
}

function deskApplications() {
  return runServerEffect(deskApplicationsEffect());
}

function deskCoverLettersEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* listCoverLettersEffect();
  });
}

function deskCoverLetters() {
  return runServerEffect(deskCoverLettersEffect());
}

function deskContentEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const [entries, skills] = yield* Effect.all([listEntriesEffect(), listSkillGroupsEffect()], {
      concurrency: "unbounded",
    });

    return { entries, skills };
  });
}

function deskContent() {
  return runServerEffect(deskContentEffect());
}

function deskProfileEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* loadProfileEffect();
  });
}

function deskProfile() {
  return runServerEffect(deskProfileEffect());
}

function deskProjectsEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* listProjectsEffect();
  });
}

function deskProjects() {
  return runServerEffect(deskProjectsEffect());
}

function deskPostingsEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* listPostingsEffect();
  });
}

function deskPostings() {
  return runServerEffect(deskPostingsEffect());
}

function deskCompaniesEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* listCompaniesEffect();
  });
}

function deskCompanies() {
  return runServerEffect(deskCompaniesEffect());
}

function deskCollectorsEffect() {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    return yield* Effect.tryPromise({
      try: () => listCollectors(),
      catch: (cause) =>
        new DatabaseError({
          message: cause instanceof HttpError ? cause.message : "Failed to list collectors.",
          cause,
        }),
    });
  });
}

function deskCollectors() {
  return runServerEffect(deskCollectorsEffect());
}

export {
  deskApplications,
  deskApplicationsEffect,
  deskCollectors,
  deskCollectorsEffect,
  deskCompanies,
  deskCompaniesEffect,
  deskContent,
  deskContentEffect,
  deskCoverLetters,
  deskCoverLettersEffect,
  deskCvs,
  deskCvsEffect,
  deskPostings,
  deskPostingsEffect,
  deskProfile,
  deskProfileEffect,
  deskProjects,
  deskProjectsEffect,
};
export { requireUser, requireUserEffect } from "./auth";
