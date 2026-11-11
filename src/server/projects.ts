import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { cvs, projects } from "../../server/db/schema";
import { HttpError } from "./http";
import type { ProjectRecord } from "../data/projects";
import { useDb } from "./db";

type ProjectRow = typeof projects.$inferSelect;

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

function notFound(id: string) {
  return new HttpError(404, `No project "${id}".`);
}

/** All projects, oldest first. */
async function listProjects(): Promise<ProjectRecord[]> {
  const rows = await useDb()
    .select()
    .from(projects)
    .orderBy(asc(projects.createdAt), asc(projects.id));

  return rows.map((row) => toProject(row));
}

/** The project with this id; a 404 error if there is none. */
async function requireProject(id: string): Promise<ProjectRecord> {
  const [row] = await useDb().select().from(projects).where(eq(projects.id, id));

  if (!row) {
    throw notFound(id);
  }

  return toProject(row);
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

/** Creates a project (409 if the id is taken) or updates one (404 if missing). */
async function saveProject(project: ProjectRecord, { create }: { create: boolean }) {
  await useDb().transaction(async (tx) => {
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
      throw create ? new HttpError(409, `Project "${project.id}" exists.`) : notFound(project.id);
    }

    // CVs print their projects, so their page checks are out of date.
    if (!create) {
      await tx.update(cvs).set({ pageFillsBuild: "" });
    }
  });
}

/** Deletes a project and takes it out of every CV that picks it. */
async function deleteProject(id: string) {
  await useDb().transaction(async (tx) => {
    const deleted = await tx
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });

    if (deleted.length === 0) {
      throw notFound(id);
    }

    await tx.update(cvs).set({
      projects: sql`array_remove(${cvs.projects}, ${id})`,
      pageFillsBuild: "",
    });
  });
}

export { deleteProject, listProjects, requireProject, saveProject };
