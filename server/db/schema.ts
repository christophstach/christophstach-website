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
import type { CvLayout } from "../../src/data/cv-print-layout";

// Column names are snake_case in the database: drizzle.config.ts and useDb()
// both pass casing "snake_case", so the properties here stay camelCase.

/** A printed CV variant, edited in the desk. Its entries are cvVariantEntries. */
const cvVariants = pgTable("cv_variants", {
  /** URL slug, e.g. /desk/cv-print/frontend. */
  id: text().primaryKey(),
  label: text().notNull(),
  /** Desk only: what it is for. Never printed or shown on the site. */
  note: text().notNull().default(""),
  role: text().notNull(),
  /** Empty prints no summary line. */
  summary: text().notNull().default(""),
  /** Project ids, in display order; /curriculum shows the website variant's. */
  projects: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** Printed under the summary, in this order; empty prints none. */
  coreTechnologies: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** skill_groups ids, in print order; empty prints no skills. */
  skills: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** Spacing, text size and page margin of its PDF; see CV_LAYOUT_STEPS. */
  layout: jsonb()
    .$type<CvLayout>()
    .notNull()
    .default(sql`'{"spacing":"normal","textSize":"normal","margin":"normal"}'::jsonb`),
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
   * The build (BUILD_ID, src/build-id.ts) that made pageFills. A deploy can change the
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
  /** Desk only: how the desk lists it. Never printed or shown on the site. */
  name: text().notNull().default(""),
  /** Desk only: what it is for. Never printed or shown on the site. */
  note: text().notNull().default(""),
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
  /** Desk only: how the desk lists it. Never printed or shown on the site. */
  name: text().notNull().default(""),
  /** Desk only: what it is for. Never printed or shown on the site. */
  note: text().notNull().default(""),
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
  /** Desk only: how the desk lists it. Never printed or shown on the site. */
  name: text().notNull().default(""),
  /** Desk only: what it is for. Never printed or shown on the site. */
  note: text().notNull().default(""),
  title: text().notNull(),
  /** Public: /curriculum shows it. */
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

/**
 * A cover letter for one application, private to the desk. Name and contact
 * details come from cv_profile.
 */
const coverLetters = pgTable("cover_letters", {
  /** URL slug, e.g. /desk/cover-letters/acme-frontend. */
  id: text().primaryKey(),
  /** Desk only: how the desk lists it. Never printed. */
  label: text().notNull(),
  /** Desk only: what it is for. Never printed. */
  note: text().notNull().default(""),
  /** The CV variant sent with it; its role is printed under the name. */
  variantId: text().references(() => cvVariants.id, { onDelete: "set null", onUpdate: "cascade" }),
  company: text().notNull(),
  /** Printed above the date when set: a person, an address, one item per line. */
  recipient: text().notNull().default(""),
  /** Desk only, like the url and the description of the job. */
  jobTitle: text().notNull().default(""),
  jobUrl: text().notNull().default(""),
  jobDescription: text().notNull().default(""),
  /** Sets the date format and the default wording. */
  language: text({ enum: ["en", "de"] })
    .notNull()
    .default("en"),
  /** ISO date, e.g. "2026-11-02"; empty prints none. */
  letterDate: text().notNull().default(""),
  subject: text().notNull().default(""),
  salutation: text().notNull().default(""),
  /** Plain text; a blank line starts a new paragraph. */
  body: text().notNull().default(""),
  closing: text().notNull().default(""),
  /** How full each page of its PDF was at the last check, 0 to 1. */
  pageFills: real()
    .array()
    .notNull()
    .default(sql`'{}'::real[]`),
  /** The build that made pageFills; a check from another build counts as none. */
  pageFillsBuild: text().notNull().default(""),
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
  coverLetters,
  cvEntries,
  cvProfile,
  cvVariantEntries,
  cvVariantEntriesRelations,
  cvVariants,
  cvVariantsRelations,
  projects,
  skillGroups,
};
