import type { CvVariant, EntryPick } from "../../app/data/cv-variants";
import { createError } from "h3";
import { isLayoutStep } from "../../app/data/cv-print-layout";

/**
 * A variant as the desk sends it. A tab opened before a deploy may lack the
 * newer fields: no note counts as empty, no core technologies or layout keeps
 * the stored ones.
 */
type CvLayout = CvVariant["layout"];

type VariantBody = Omit<CvVariant, "coreTechnologies" | "layout"> & {
  coreTechnologies?: string[];
  layout?: CvLayout;
};

// URL slug: lowercase words joined by single hyphens, e.g. "ai-platform".
const VARIANT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// Ids taken by desk pages under /desk/cv, e.g. /desk/cv/projects.
const RESERVED_IDS = new Set(["education", "experience", "profile", "projects", "skills"]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPicks(value: unknown): value is EntryPick[] {
  return (
    Array.isArray(value) &&
    value.every(
      (pick: Partial<EntryPick> | null) =>
        typeof pick?.id === "string" && isStringArray(pick.bullets),
    )
  );
}

function isLayout(value: unknown): value is CvLayout {
  const layout = value as Partial<Record<keyof CvLayout, unknown>> | null;

  return (
    typeof layout === "object" &&
    layout !== null &&
    isLayoutStep("spacing", layout.spacing) &&
    isLayoutStep("textSize", layout.textSize) &&
    isLayoutStep("margin", layout.margin)
  );
}

function isVariant(value: Partial<CvVariant>): boolean {
  return (
    typeof value.label === "string" &&
    value.label.trim() !== "" &&
    (value.note === undefined || typeof value.note === "string") &&
    typeof value.role === "string" &&
    typeof value.summary === "string" &&
    (value.coreTechnologies === undefined || isStringArray(value.coreTechnologies)) &&
    isPicks(value.experience) &&
    isPicks(value.education) &&
    isStringArray(value.projects) &&
    isStringArray(value.skills) &&
    (value.layout === undefined || isLayout(value.layout))
  );
}

/**
 * Checks the shape of a variant sent by the desk; the route's id wins over
 * any id in the body. Whether its ids exist in cv.ts is saveVariant's check.
 */
function parseVariantBody(id: string, body: unknown): VariantBody {
  const value = (body ?? {}) as Partial<CvVariant>;

  if (!VARIANT_ID.test(id)) {
    throw createError({
      statusCode: 400,
      message: `"${id}" is no valid id: use lowercase letters, digits and hyphens.`,
    });
  }

  if (RESERVED_IDS.has(id)) {
    throw createError({ statusCode: 400, message: `"${id}" is taken by a desk page.` });
  }

  if (!isVariant(value)) {
    throw createError({ statusCode: 400, message: "Not a CV variant." });
  }

  const variant = value as CvVariant;

  return {
    id,
    label: variant.label.trim(),
    note: (variant.note ?? "").trim(),
    role: variant.role.trim(),
    summary: variant.summary.trim(),
    coreTechnologies: variant.coreTechnologies?.map((item) => item.trim()).filter(Boolean),
    experience: variant.experience,
    education: variant.education,
    projects: variant.projects,
    skills: variant.skills,
    layout: variant.layout && {
      spacing: variant.layout.spacing,
      textSize: variant.layout.textSize,
      margin: variant.layout.margin,
    },
  };
}

export type { VariantBody };
export { parseVariantBody };
