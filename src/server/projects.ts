import "server-only";
import { Effect } from "effect";
import { asc, eq, sql } from "drizzle-orm";
import { cvs, projects } from "../../server/db/schema";
import type { ProjectRecord } from "../data/projects";
import {
  type ConfigError,
  ConflictError,
  type Database,
  type DatabaseError,
  NotFoundError,
  dbQuery,
  dbTransaction,
  isPgErrorCode,
  runServerEffect,
} from "./effect";

type ProjectRow = typeof projects.$inferSelect;

type SaveProjectOutcome = { ok: true } | { ok: false; reason: "conflict" | "not_found" };

type DeleteProjectOutcome = { ok: true } | { ok: false; reason: "not_found" };

function toProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    title: row.title,
    description: row.description,
    tech: row.tech,
    url: row.url,
  };
}

function projectNotFound(id: string): NotFoundError {
  return new NotFoundError({ message: `No project "${id}".` });
}

function projectColumns(project: ProjectRecord) {
  return {
    name: project.name,
    note: project.note,
    title: project.title,
    description: project.description,
    tech: project.tech,
    url: project.url,
    updatedAt: new Date(),
  };
}

/** All projects, oldest first. */
function listProjectsEffect(): Effect.Effect<
  ProjectRecord[],
  DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const rows = yield* dbQuery(
      (db) => db.select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id)),
      "Failed to list projects.",
    );

    return rows.map((row) => toProject(row));
  });
}

/** All projects, oldest first. */
function listProjects(): Promise<ProjectRecord[]> {
  return runServerEffect(listProjectsEffect());
}

/** The project with this id; a 404 error if there is none. */
function requireProjectEffect(
  id: string,
): Effect.Effect<ProjectRecord, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) => db.select().from(projects).where(eq(projects.id, id)),
      `Failed to load project "${id}".`,
    );

    if (!row) {
      return yield* projectNotFound(id);
    }

    return toProject(row);
  });
}

/** The project with this id; a 404 error if there is none. */
function requireProject(id: string): Promise<ProjectRecord> {
  return runServerEffect(requireProjectEffect(id));
}

/** Creates a project (409 if the id is taken) or updates one (404 if missing). */
function saveProjectEffect(
  project: ProjectRecord,
  { create }: { create: boolean },
): Effect.Effect<void, ConflictError | NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const outcome = yield* dbTransaction<SaveProjectOutcome>(async (tx) => {
      const written = create
        ? await tx
            .insert(projects)
            .values({ id: project.id, ...projectColumns(project) })
            .onConflictDoNothing()
            .returning({ id: projects.id })
        : await tx
            .update(projects)
            .set(projectColumns(project))
            .where(eq(projects.id, project.id))
            .returning({ id: projects.id });

      if (written.length === 0) {
        return { ok: false, reason: create ? "conflict" : "not_found" };
      }

      // CVs print their projects, so their page checks are out of date.
      if (!create) {
        await tx.update(cvs).set({ pageFillsBuild: "" });
      }

      return { ok: true };
    }, `Failed to save project "${project.id}".`).pipe(
      Effect.catchTag(
        "DatabaseError",
        (error): Effect.Effect<never, ConflictError | DatabaseError> =>
          isPgErrorCode(error, "23505")
            ? new ConflictError({ message: `Project "${project.id}" exists.`, cause: error })
            : error,
      ),
    );

    if (!outcome.ok) {
      if (outcome.reason === "conflict") {
        return yield* new ConflictError({ message: `Project "${project.id}" exists.` });
      }

      return yield* projectNotFound(project.id);
    }

    return undefined;
  });
}

/** Creates a project (409 if the id is taken) or updates one (404 if missing). */
function saveProject(project: ProjectRecord, options: { create: boolean }): Promise<void> {
  return runServerEffect(saveProjectEffect(project, options));
}

/** Deletes a project and takes it out of every CV that picks it. */
function deleteProjectEffect(
  id: string,
): Effect.Effect<void, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const outcome = yield* dbTransaction<DeleteProjectOutcome>(async (tx) => {
      const deleted = await tx
        .delete(projects)
        .where(eq(projects.id, id))
        .returning({ id: projects.id });

      if (deleted.length === 0) {
        return { ok: false, reason: "not_found" };
      }

      await tx.update(cvs).set({
        projects: sql`array_remove(${cvs.projects}, ${id})`,
        pageFillsBuild: "",
      });

      return { ok: true };
    }, `Failed to delete project "${id}".`);

    if (!outcome.ok) {
      return yield* projectNotFound(id);
    }

    return undefined;
  });
}

/** Deletes a project and takes it out of every CV that picks it. */
function deleteProject(id: string): Promise<void> {
  return runServerEffect(deleteProjectEffect(id));
}

export {
  deleteProject,
  deleteProjectEffect,
  listProjects,
  listProjectsEffect,
  requireProject,
  requireProjectEffect,
  saveProject,
  saveProjectEffect,
};
