import type { CvVariant, EntryPick } from "../../app/data/cv-variants";
import { DEFAULT_CV_LAYOUT, normalizeCvLayout } from "../../app/data/cv-print-layout";
import { asc, eq, sql } from "drizzle-orm";
import { cvVariantEntries, cvVariants } from "../db/schema";
import type { VariantBody } from "./cv-variant-body";
import { createError } from "h3";
import { loadCvContent } from "./cv-content";
import { printVariant } from "../../app/utils/cv-variant";
import { useDb } from "./db";
import { useRuntimeConfig } from "nitropack/runtime";

type Section = "experience" | "education";
/** The two public roles a variant can hold, each held by exactly one variant. */
type Mark = "isPrimary" | "isWebsite";
type VariantRow = typeof cvVariants.$inferSelect & {
  entries: (typeof cvVariantEntries.$inferSelect)[];
};

const SECTIONS: Section[] = ["experience", "education"];

function picks(row: VariantRow, section: Section): EntryPick[] {
  return row.entries
    .filter((entry) => entry.section === section)
    .toSorted((first, second) => first.position - second.position)
    .map((entry) => ({ id: entry.entryId, bullets: entry.bullets }));
}

function toVariant(row: VariantRow): CvVariant {
  return {
    id: row.id,
    label: row.label,
    note: row.note,
    role: row.role,
    summary: row.summary,
    coreTechnologies: row.coreTechnologies,
    experience: picks(row, "experience"),
    education: picks(row, "education"),
    projects: row.projects,
    skills: row.skills,
    layout: normalizeCvLayout(row.layout),
  };
}

function notFound(id: string) {
  return createError({ statusCode: 404, message: `No CV variant "${id}".` });
}

/** This deployment's build; page checks from other builds are out of date. */
function currentBuild(): string {
  return useRuntimeConfig().app.buildId;
}

/**
 * All variants, oldest first, each with when it was last saved and its last
 * page check (empty if there was none on this build); and the ids of the
 * primary and the website one.
 */
async function listVariants() {
  const build = currentBuild();
  const rows = await useDb().query.cvVariants.findMany({
    with: { entries: true },
    orderBy: [asc(cvVariants.createdAt), asc(cvVariants.id)],
  });

  return {
    variants: rows.map((row) => ({
      ...toVariant(row),
      updatedAt: row.updatedAt.toISOString(),
      pageFills: row.pageFillsBuild === build ? row.pageFills : [],
    })),
    primaryId: rows.find((row) => row.isPrimary)?.id ?? "",
    websiteId: rows.find((row) => row.isWebsite)?.id ?? "",
  };
}

/** The variant with this id; a 404 error if there is none. */
async function requireVariant(id: string): Promise<CvVariant> {
  const row = await useDb().query.cvVariants.findFirst({
    where: eq(cvVariants.id, id),
    with: { entries: true },
  });

  if (!row) {
    throw notFound(id);
  }

  return toVariant(row);
}

/**
 * The variant holding a public role: isPrimary for /cv-print and the
 * downloadable PDF, isWebsite for /curriculum.
 */
async function requireMarkedVariant(mark: Mark): Promise<CvVariant> {
  const row = await useDb().query.cvVariants.findFirst({
    where: eq(cvVariants[mark], true),
    with: { entries: true },
  });

  if (!row) {
    throw createError({ statusCode: 500, message: `No CV variant is marked ${mark}.` });
  }

  return toVariant(row);
}

function entryRows(variant: VariantBody) {
  return SECTIONS.flatMap((section) =>
    variant[section].map((pick, position) => ({
      variantId: variant.id,
      section,
      position,
      entryId: pick.id,
      bullets: pick.bullets,
    })),
  );
}

function variantColumns(variant: VariantBody) {
  return {
    label: variant.label,
    note: variant.note,
    role: variant.role,
    summary: variant.summary,
    ...(variant.coreTechnologies ? { coreTechnologies: variant.coreTechnologies } : {}),
    projects: variant.projects,
    skills: variant.skills,
    ...(variant.layout ? { layout: variant.layout } : {}),
    // The stored page check no longer matches the content.
    pageFills: [],
    updatedAt: new Date(),
  };
}

/**
 * Writes a variant and replaces its entries in one transaction. Content is
 * checked against cv.ts first, so a stored variant always prints.
 */
async function saveVariant(variant: VariantBody, { create }: { create: boolean }) {
  const content = await loadCvContent();

  try {
    printVariant(
      {
        ...variant,
        coreTechnologies: variant.coreTechnologies ?? [],
        layout: variant.layout ?? DEFAULT_CV_LAYOUT,
      },
      content,
    );
  } catch (error) {
    throw createError({ statusCode: 400, message: (error as Error).message });
  }

  await useDb().transaction(async (tx) => {
    const written = create
      ? await tx
          .insert(cvVariants)
          .values({ id: variant.id, ...variantColumns(variant) })
          .onConflictDoNothing()
          .returning({ id: cvVariants.id })
      : await tx
          .update(cvVariants)
          .set(variantColumns(variant))
          .where(eq(cvVariants.id, variant.id))
          .returning({ id: cvVariants.id });

    if (written.length === 0) {
      throw create
        ? createError({ statusCode: 409, message: `CV variant "${variant.id}" exists.` })
        : notFound(variant.id);
    }

    const rows = entryRows(variant);

    await tx.delete(cvVariantEntries).where(eq(cvVariantEntries.variantId, variant.id));

    if (rows.length > 0) {
      await tx.insert(cvVariantEntries).values(rows);
    }
  });
}

/** A variant's printed content, resolved against the content in the database. */
async function printStoredVariant(variant: CvVariant) {
  return printVariant(variant, await loadCvContent());
}

/** Remembers the result of a page check, so the desk overview can show it. */
async function storePageFills(id: string, fills: number[]) {
  await useDb()
    .update(cvVariants)
    .set({ pageFills: fills, pageFillsBuild: currentBuild() })
    .where(eq(cvVariants.id, id));
}

/** Gives this variant a public role; the variant that held it loses it. */
async function markVariant(id: string, mark: Mark) {
  await requireVariant(id);
  await useDb()
    .update(cvVariants)
    .set({ [mark]: sql`${cvVariants.id} = ${id}` });
}

/** Deletes a variant, but never one with a public role: the site needs it. */
async function deleteVariant(id: string) {
  const deleted = await useDb()
    .delete(cvVariants)
    .where(
      sql`${cvVariants.id} = ${id} and not ${cvVariants.isPrimary} and not ${cvVariants.isWebsite}`,
    )
    .returning({ id: cvVariants.id });

  if (deleted.length === 0) {
    await requireVariant(id);

    throw createError({
      statusCode: 409,
      message:
        "The primary and the website variant can't be deleted. Give the role to another variant first.",
    });
  }
}

export {
  deleteVariant,
  listVariants,
  markVariant,
  printStoredVariant,
  requireMarkedVariant,
  requireVariant,
  saveVariant,
  storePageFills,
};
