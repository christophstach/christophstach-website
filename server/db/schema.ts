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
import type { ApplicationContact, ApplicationEvent } from "../../src/data/applications";
import type { CvLayout } from "../../src/data/cv-print-layout";

// Column names are snake_case in the database: drizzle.config.ts and useDb()
// both pass casing "snake_case", so the properties here stay camelCase.

/** A printed CV, edited in the desk. Its entries are cvEntryPicks. */
const cvs = pgTable("cvs", {
  /** URL slug, e.g. /desk/cv-print/frontend. */
  id: text().primaryKey(),
  label: text().notNull(),
  /** Desk only: what it is for. Never printed or shown on the site. */
  note: text().notNull().default(""),
  role: text().notNull(),
  /** Empty prints no summary line. */
  summary: text().notNull().default(""),
  /** Project ids, in display order; /curriculum shows the website CV's. */
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
  /** The public CV behind /cv-print and /christoph-stach-cv.pdf; one at a time. */
  isPrimary: boolean().notNull().default(false),
  /** The CV /curriculum shows, usually with every bullet; one at a time. */
  isWebsite: boolean().notNull().default(false),
  /**
   * How full each page of its PDF was at the last check in the desk, 0 to 1;
   * empty until checked, and cleared when the CV is saved.
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

/** One timeline entry of a CV, with the bullets it prints, in order. */
const cvEntryPicks = pgTable(
  "cv_entry_picks",
  {
    cvId: text()
      .notNull()
      .references(() => cvs.id, { onDelete: "cascade", onUpdate: "cascade" }),
    section: text({ enum: ["experience", "education"] }).notNull(),
    position: integer().notNull(),
    /** A cv_entries id. */
    entryId: text().notNull(),
    /** Bullet ids of that entry, in print order. */
    bullets: text().array().notNull(),
  },
  (table) => [primaryKey({ columns: [table.cvId, table.section, table.position] })],
);

/**
 * A timeline entry, a job or a degree, that CVs pick from. Its id and
 * section are fixed once created: CVs refer to the id.
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
  /** In display order; CVs pick them by id. */
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

/** A group of skills; the home page shows all, CVs pick which they print. */
const skillGroups = pgTable("skill_groups", {
  /** Terminal-style label used on the site, e.g. "frontend"; CVs refer to it. */
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
  /** Not printed: each CV has its own role line. */
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

/** A project shown on /curriculum when the website CV picks it. */
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

/** One job applied for, or about to be, private to the desk. */
const applications = pgTable("applications", {
  /** URL slug, e.g. /desk/applications/acme-frontend. */
  id: text().primaryKey(),
  company: text().notNull(),
  jobTitle: text().notNull().default(""),
  jobUrl: text().notNull().default(""),
  /** The ad, kept to write against, also after it goes offline. */
  jobDescription: text().notNull().default(""),
  /** Where the job is: a city, remote or hybrid. */
  location: text().notNull().default(""),
  source: text({ enum: ["portal", "linkedin", "recruiter", "referral", "direct", "other"] })
    .notNull()
    .default("other"),
  status: text({
    enum: ["saved", "applied", "interviewing", "offer", "accepted", "rejected", "withdrawn"],
  })
    .notNull()
    .default("saved"),
  /** The CV sent with it. */
  cvId: text().references(() => cvs.id, { onDelete: "set null", onUpdate: "cascade" }),
  /** ISO date; empty until it is sent. */
  appliedOn: text().notNull().default(""),
  /** What to do next, and by when (ISO date); both may be empty. */
  nextStep: text().notNull().default(""),
  nextStepOn: text().notNull().default(""),
  contacts: jsonb()
    .$type<ApplicationContact[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  /** The history, oldest first. */
  events: jsonb()
    .$type<ApplicationEvent[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  note: text().notNull().default(""),
  /**
   * The CV and cover letters as they printed when it was marked as sent
   * (SentCopy, src/data/sent-copy.ts); null until then. Parsed when read.
   */
  sent: jsonb(),
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
  /**
   * The application it belongs to: its job and its CV, whose role prints under
   * the name. Deleting the application deletes the letter.
   */
  applicationId: text()
    .notNull()
    .references(() => applications.id, { onDelete: "cascade", onUpdate: "cascade" }),
  /** Desk only: how the desk lists it. Never printed. */
  label: text().notNull(),
  /** Desk only: what it is for. Never printed. */
  note: text().notNull().default(""),
  /** Printed above the date when set: a person, an address, one item per line. */
  recipient: text().notNull().default(""),
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

const cvsRelations = relations(cvs, ({ many }) => ({
  entries: many(cvEntryPicks),
}));

const cvEntryPicksRelations = relations(cvEntryPicks, ({ one }) => ({
  cv: one(cvs, { fields: [cvEntryPicks.cvId], references: [cvs.id] }),
}));

export {
  applications,
  coverLetters,
  cvEntries,
  cvProfile,
  cvEntryPicks,
  cvEntryPicksRelations,
  cvs,
  cvsRelations,
  projects,
  skillGroups,
};
