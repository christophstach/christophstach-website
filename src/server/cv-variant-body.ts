import "server-only";
import { array, object, optional, string } from "zod/mini";
import { parseInput, requireSlug, stringList, text, trimmed } from "./input";
import type { CvVariant } from "../data/cv-variants";
import { HttpError } from "./http";
import { cvLayoutSchema } from "../data/cv-print-layout";

/**
 * A variant as the desk sends it. A tab opened before a deploy may lack the
 * newer fields: no note counts as empty, no core technologies or layout keeps
 * the stored ones.
 */
type VariantBody = Omit<CvVariant, "coreTechnologies" | "layout"> & {
  coreTechnologies?: CvVariant["coreTechnologies"];
  layout?: CvVariant["layout"];
};

// Ids taken by desk pages under /desk/cv, e.g. /desk/cv/projects.
const RESERVED_IDS = new Set(["education", "experience", "profile", "projects", "skills"]);
const NOT_VARIANT = "Not a CV variant.";

const idsSchema = array(string(NOT_VARIANT), NOT_VARIANT);
const pickSchema = object({ id: string(NOT_VARIANT), bullets: idsSchema }, NOT_VARIANT);
const picksSchema = array(pickSchema, NOT_VARIANT);

const variantSchema = object(
  {
    label: text(NOT_VARIANT),
    note: optional(trimmed(NOT_VARIANT)),
    role: trimmed(NOT_VARIANT),
    summary: trimmed(NOT_VARIANT),
    coreTechnologies: optional(stringList(NOT_VARIANT)),
    experience: picksSchema,
    education: picksSchema,
    projects: idsSchema,
    skills: idsSchema,
    layout: optional(cvLayoutSchema),
  },
  NOT_VARIANT,
);

/**
 * Checks the shape of a variant sent by the desk; the route's id wins over
 * any id in the body. Whether its ids exist in the content is saveVariant's check.
 */
function parseVariantBody(id: string, body: unknown): VariantBody {
  requireSlug(id);

  if (RESERVED_IDS.has(id)) {
    throw new HttpError(400, `"${id}" is taken by a desk page.`);
  }

  const { note, coreTechnologies, layout, ...variant } = parseInput(variantSchema, body ?? {});

  return {
    id,
    ...variant,
    note: note ?? "",
    ...(coreTechnologies === undefined ? {} : { coreTechnologies }),
    ...(layout === undefined ? {} : { layout }),
  };
}

export type { VariantBody };
export { parseVariantBody };
