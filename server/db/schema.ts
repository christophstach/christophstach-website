import { boolean, integer, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";
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
  /** Project ids, in display order; /curriculum shows the website variant's. */
  projects: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** SkillGroup labels from cv.ts, in print order; empty prints no skills. */
  skills: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** The public variant behind /cv-print and /christoph-stach-cv.pdf; one at a time. */
  isPrimary: boolean().notNull().default(false),
  /** The variant /curriculum shows, usually with every bullet; one at a time. */
  isWebsite: boolean().notNull().default(false),
  /**
   * How full each page of its PDF was at the last check in the desk, 0 to 1;
   * empty until checked, and cleared when the variant is saved.
   */
  pageFills: real()
    .array()
    .notNull()
    .default(sql`'{}'::real[]`),
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

/** A project shown on /curriculum when the website variant picks it. */
const projects = pgTable("projects", {
  /** URL slug, e.g. /desk/projects/tiger. */
  id: text().primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  tech: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** Optional link to the project; empty shows none. */
  url: text().notNull().default(""),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

const cvVariantsRelations = relations(cvVariants, ({ many }) => ({
  entries: many(cvVariantEntries),
}));

const cvVariantEntriesRelations = relations(cvVariantEntries, ({ one }) => ({
  variant: one(cvVariants, { fields: [cvVariantEntries.variantId], references: [cvVariants.id] }),
}));

export { cvVariantEntries, cvVariantEntriesRelations, cvVariants, cvVariantsRelations, projects };
