import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
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
  /** skill_groups ids, in print order; empty prints no skills. */
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
  /**
   * The build (Nuxt buildId) that made pageFills. A deploy can change the
   * layout, so a check from another build counts as not checked.
   */
  pageFillsBuild: text().notNull().default(""),
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
    /** A cv_entries id. */
    entryId: text().notNull(),
    /** Bullet ids of that entry, in print order. */
    bullets: text().array().notNull(),
  },
  (table) => [primaryKey({ columns: [table.variantId, table.section, table.position] })],
);

/**
 * A timeline entry, a job or a degree, that variants pick from. Its id and
 * section are fixed once created: variants refer to the id.
 */
const cvEntries = pgTable("cv_entries", {
  /** Stable id, e.g. "mbition"; also the URL slug in the desk. */
  id: text().primaryKey(),
  section: text({ enum: ["experience", "education"] }).notNull(),
  title: text().notNull(),
  organization: text().notNull(),
  /** Empty shows none. */
  location: text().notNull().default(""),
  /** ISO month, e.g. "2023-10". */
  from: text().notNull(),
  /** ISO month; empty means ongoing. */
  to: text().notNull().default(""),
  tech: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** In display order; variants pick them by id. */
  bullets: jsonb()
    .$type<{ id: string; text: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  links: jsonb()
    .$type<{ text: string; href: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** A group of skills; the home page shows all, variants pick which they print. */
const skillGroups = pgTable("skill_groups", {
  /** Terminal-style label used on the site, e.g. "frontend"; variants refer to it. */
  id: text().primaryKey(),
  /** Prose heading used in the PDF. */
  title: text().notNull(),
  items: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  position: integer().notNull().default(0),
});

/** The CV's header: who it is about and how to reach them. A single row, id 1. */
const cvProfile = pgTable("cv_profile", {
  id: integer().primaryKey().default(1),
  name: text().notNull(),
  /** Not printed: each variant has its own role line. */
  role: text().notNull().default(""),
  location: text().notNull().default(""),
  email: text().notNull().default(""),
  phone: text().notNull().default(""),
  /** Not printed yet. */
  coreTechnologies: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  links: jsonb()
    .$type<{ label: string; href: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** A project shown on /curriculum when the website variant picks it. */
const projects = pgTable("projects", {
  /** URL slug, e.g. /desk/projects/ai-agent-platform. */
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

export {
  cvEntries,
  cvProfile,
  cvVariantEntries,
  cvVariantEntriesRelations,
  cvVariants,
  cvVariantsRelations,
  projects,
  skillGroups,
};
