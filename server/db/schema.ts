import { boolean, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Column names are snake_case in the database: drizzle.config.ts and useDb()
// both pass casing "snake_case", so the properties here stay camelCase.

/** A printed CV variant, edited in the desk. Its entries are cvVariantEntries. */
const cvVariants = pgTable("cv_variants", {
  /** URL slug, e.g. /desk/cv-print/frontend. */
  id: text().primaryKey(),
  label: text().notNull(),
  role: text().notNull(),
  /** Empty prints no summary line. */
  summary: text().notNull().default(""),
  /** SkillGroup labels from cv.ts, in print order; empty prints no skills. */
  skills: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** The public variant behind /cv-print and /christoph-stach-cv.pdf; one at a time. */
  isPrimary: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** One timeline entry of a variant, with the bullets it prints, in order. */
const cvVariantEntries = pgTable(
  "cv_variant_entries",
  {
    variantId: text()
      .notNull()
      .references(() => cvVariants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    section: text({ enum: ["experience", "education"] }).notNull(),
    position: integer().notNull(),
    /** A TimelineEntry id from cv.ts. */
    entryId: text().notNull(),
    /** Bullet ids of that entry, in print order. */
    bullets: text().array().notNull(),
  },
  (table) => [primaryKey({ columns: [table.variantId, table.section, table.position] })],
);

const cvVariantsRelations = relations(cvVariants, ({ many }) => ({
  entries: many(cvVariantEntries),
}));

const cvVariantEntriesRelations = relations(cvVariantEntries, ({ one }) => ({
  variant: one(cvVariants, { fields: [cvVariantEntries.variantId], references: [cvVariants.id] }),
}));

export { cvVariantEntries, cvVariantEntriesRelations, cvVariants, cvVariantsRelations };
