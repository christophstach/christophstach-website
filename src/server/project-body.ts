import "server-only";
import { HttpError } from "./http";
import type { ProjectRecord } from "../data/projects";

// URL slug: lowercase words joined by single hyphens, e.g. "crowds-ui".
const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function isProject(value: Partial<ProjectRecord>): boolean {
  return (
    (value.name === undefined || (typeof value.name === "string" && value.name.trim() !== "")) &&
    typeof value.title === "string" &&
    value.title.trim() !== "" &&
    typeof value.description === "string" &&
    typeof value.url === "string" &&
    Array.isArray(value.tech) &&
    value.tech.every((item) => typeof item === "string")
  );
}

/** Checks the shape of a project sent by the desk; the route's id wins. */
function parseProjectBody(id: string, body: unknown): ProjectRecord {
  const value = (body ?? {}) as Partial<ProjectRecord>;

  if (!PROJECT_ID.test(id)) {
    throw new HttpError(400, `"${id}" is no valid id: use lowercase letters, digits and hyphens.`);
  }

  if (!isProject(value)) {
    throw new HttpError(400, "Not a project.");
  }

  const project = value as ProjectRecord;

  return {
    id,
    // A tab opened before names existed sends none: fall back to the title.
    name: (project.name ?? project.title).trim(),
    note: typeof project.note === "string" ? project.note.trim() : "",
    title: project.title.trim(),
    description: project.description.trim(),
    tech: project.tech.map((item) => item.trim()).filter(Boolean),
    url: project.url.trim(),
  };
}

export { parseProjectBody };
