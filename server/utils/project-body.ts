import type { Project } from "../../app/data/projects";
import { createError } from "h3";

// URL slug: lowercase words joined by single hyphens, e.g. "crowds-ui".
const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function isProject(value: Partial<Project>): boolean {
  return (
    typeof value.title === "string" &&
    value.title.trim() !== "" &&
    typeof value.description === "string" &&
    typeof value.url === "string" &&
    Array.isArray(value.tech) &&
    value.tech.every((item) => typeof item === "string")
  );
}

/** Checks the shape of a project sent by the desk; the route's id wins. */
function parseProjectBody(id: string, body: unknown): Project {
  const value = (body ?? {}) as Partial<Project>;

  if (!PROJECT_ID.test(id)) {
    throw createError({
      statusCode: 400,
      message: `"${id}" is no valid id: use lowercase letters, digits and hyphens.`,
    });
  }

  if (!isProject(value)) {
    throw createError({ statusCode: 400, message: "Not a project." });
  }

  const project = value as Project;

  return {
    id,
    title: project.title.trim(),
    description: project.description.trim(),
    tech: project.tech.map((item) => item.trim()).filter(Boolean),
    url: project.url.trim(),
  };
}

export { parseProjectBody };
