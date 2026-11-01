import type { CvVariant, EntryPick } from "../../app/data/cv-variants";
import { asc, eq, sql } from "drizzle-orm";
import { cvVariantEntries, cvVariants } from "../db/schema";
import { createError } from "h3";
import { printVariant } from "../../app/utils/cv-variant";
import { useDb } from "./db";

type Section = "experience" | "education";
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
    role: row.role,
    summary: row.summary,
    experience: picks(row, "experience"),
    education: picks(row, "education"),
    skills: row.skills,
  };
}

function notFound(id: string) {
  return createError({ statusCode: 404, message: `No CV variant "${id}".` });
}

/** All variants, oldest first, and the id of the primary one. */
async function listVariants() {
  const rows = await useDb().query.cvVariants.findMany({
    with: { entries: true },
    orderBy: [asc(cvVariants.createdAt), asc(cvVariants.id)],
  });

  return {
    variants: rows.map((row) => toVariant(row)),
    primaryId: rows.find((row) => row.isPrimary)?.id ?? "",
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

/** The public variant, which /cv-print and the downloadable PDF show. */
async function requirePrimaryVariant(): Promise<CvVariant> {
  const row = await useDb().query.cvVariants.findFirst({
    where: eq(cvVariants.isPrimary, true),
    with: { entries: true },
  });

  if (!row) {
    throw createError({ statusCode: 500, message: "No CV variant is marked primary." });
  }

  return toVariant(row);
}

function entryRows(variant: CvVariant) {
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

function variantColumns(variant: CvVariant) {
  return {
    label: variant.label,
    role: variant.role,
    summary: variant.summary,
    skills: variant.skills,
    updatedAt: new Date(),
  };
}

/**
 * Writes a variant and replaces its entries in one transaction. Content is
 * checked against cv.ts first, so a stored variant always prints.
 */
async function saveVariant(variant: CvVariant, { create }: { create: boolean }) {
  try {
    printVariant(variant);
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

/** Makes this variant the public one; every other variant stops being primary. */
async function setPrimaryVariant(id: string) {
  await requireVariant(id);
  await useDb()
    .update(cvVariants)
    .set({ isPrimary: sql`${cvVariants.id} = ${id}` });
}

/** Deletes a variant, but never the primary one: the public CV needs it. */
async function deleteVariant(id: string) {
  const deleted = await useDb()
    .delete(cvVariants)
    .where(sql`${cvVariants.id} = ${id} and not ${cvVariants.isPrimary}`)
    .returning({ id: cvVariants.id });

  if (deleted.length === 0) {
    await requireVariant(id);

    throw createError({
      statusCode: 409,
      message: "The primary variant can't be deleted. Make another one primary first.",
    });
  }
}

export {
  deleteVariant,
  listVariants,
  requirePrimaryVariant,
  requireVariant,
  saveVariant,
  setPrimaryVariant,
};
