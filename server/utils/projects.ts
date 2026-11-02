import { asc, eq, sql } from "drizzle-orm";
import { cvVariants, projects } from "../db/schema";
import type { ProjectRecord } from "../../app/data/projects";
import { createError } from "h3";
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
  return createError({ statusCode: 404, message: `No project "${id}".` });
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
  const written = create
    ? await useDb()
        .insert(projects)
        .values({ id: project.id, ...projectColumns(project) })
        .onConflictDoNothing()
        .returning({ id: projects.id })
    : await useDb()
        .update(projects)
        .set(projectColumns(project))
        .where(eq(projects.id, project.id))
        .returning({ id: projects.id });

  if (written.length === 0) {
    throw create
      ? createError({ statusCode: 409, message: `Project "${project.id}" exists.` })
      : notFound(project.id);
  }
}

/** Deletes a project and takes it out of every variant that picks it. */
async function deleteProject(id: string) {
  await useDb().transaction(async (tx) => {
    const deleted = await tx
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });

    if (deleted.length === 0) {
      throw notFound(id);
    }

    await tx.update(cvVariants).set({ projects: sql`array_remove(${cvVariants.projects}, ${id})` });
  });
}

export { deleteProject, listProjects, requireProject, saveProject };
