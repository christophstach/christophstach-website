import {
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { ApplicationContact, ApplicationEvent } from "../../src/data/applications";
import type { CvLayout } from "../../src/data/cv-print-layout";
import type { CompanySource } from "../../src/data/companies";
import type { AtsBoard } from "../../src/data/postings";

// Column names are snake_case in the database: drizzle.config.ts and useDb()
// both pass casing "snake_case", so the properties here stay camelCase.
//
// The schema is strict: what the app checks before it writes, the database
// checks too, so a script, a migration or an edit by hand can't store what
// the app would refuse. Each CHECK is named "<table>_<rule>_check".

// ---------- Values and formats ----------

const SECTIONS = ["experience", "education"] as const;
const COLLECTOR_TYPES = ["linkedin-email", "ats-board"] as const;
const POSTING_SOURCES = ["linkedin", "web", "greenhouse", "lever", "ashby", "personio"] as const;
const WORKPLACES = ["", "remote", "hybrid", "onsite"] as const;
const POSTING_STATUSES = ["new", "favourite", "dismissed"] as const;
const COMPANY_FIELDS = [
  "",
  "ai",
  "devtools",
  "data",
  "security",
  "fintech",
  "health",
  "commerce",
  "mobility",
  "enterprise",
  "consumer",
  "agency",
  "other",
] as const;
const COMPANY_FUNDINGS = ["", "vc", "public", "private", "subsidiary"] as const;
const APPLICATION_SOURCES = [
  "portal",
  "linkedin",
  "recruiter",
  "referral",
  "direct",
  "other",
] as const;
const APPLICATION_STATUSES = ["preparing", "applied"] as const;
const LANGUAGES = ["en", "de"] as const;
const SALARY_CURRENCIES = ["", "EUR", "USD", "GBP", "CHF"] as const;

/** A URL slug: lowercase words joined by single hyphens (requireSlug in src/server/input.ts). */
const SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";
/** A skill group's key: also allows underscores (KEY in src/server/cv-content-body.ts). */
const KEY = "^[a-z0-9][a-z0-9_-]*$";
const ISO_DATE = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";
const ISO_MONTH = "^[0-9]{4}-(0[1-9]|1[0-2])$";
const WEB_ADDRESS = "^https?://.";
/** The most a yearly salary may be, as in src/server/job-terms.ts. */
const SALARY_MAX = 100_000_000;

/** A string as an SQL literal. */
function literal(value: string): SQL {
  return sql.raw(`'${value.replaceAll("'", "''")}'`);
}

/** The column holds one of these values. */
function oneOf(name: string, column: AnyPgColumn, values: readonly string[]) {
  return check(name, sql`${column} in (${sql.join(values.map(literal), sql`, `)})`);
}

/** The column matches a POSIX regular expression. */
function matches(name: string, column: AnyPgColumn, pattern: string) {
  return check(name, sql`${column} ~ ${literal(pattern)}`);
}

/** The column is empty, or matches a POSIX regular expression. */
function emptyOr(name: string, column: AnyPgColumn, pattern: string) {
  return check(name, sql`${column} = '' or ${column} ~ ${literal(pattern)}`);
}

/** The column holds more than whitespace. */
function filled(name: string, column: AnyPgColumn) {
  return check(name, sql`btrim(${column}) <> ''`);
}

/** The jsonb column holds an array. */
function jsonArray(name: string, column: AnyPgColumn) {
  return check(name, sql`jsonb_typeof(${column}) = 'array'`);
}

/** A yearly salary range: not negative, not too large, in order, in a known currency. */
function salaryChecks(
  table: string,
  columns: { salaryMin: AnyPgColumn; salaryMax: AnyPgColumn; salaryCurrency: AnyPgColumn },
) {
  const { salaryMin, salaryMax, salaryCurrency } = columns;

  return [
    check(
      `${table}_salary_range_check`,
      sql`(${salaryMin} is null or ${salaryMin} between 0 and ${sql.raw(String(SALARY_MAX))})
        and (${salaryMax} is null or ${salaryMax} between 0 and ${sql.raw(String(SALARY_MAX))})
        and (${salaryMin} is null or ${salaryMax} is null or ${salaryMin} <= ${salaryMax})`,
    ),
    oneOf(`${table}_salary_currency_check`, salaryCurrency, SALARY_CURRENCIES),
  ];
}

// ---------- Tables ----------

/** A printed CV, edited in the desk. Its entries are cvEntryPicks. */
const cvs = pgTable(
  "cvs",
  {
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
  },
  (table) => [
    matches("cvs_id_check", table.id, SLUG),
    filled("cvs_label_check", table.label),
    check("cvs_layout_check", sql`jsonb_typeof(${table.layout}) = 'object'`),
    // One primary and one website CV at most: a second one is refused.
    uniqueIndex("cvs_one_primary")
      .on(table.isPrimary)
      .where(sql`${table.isPrimary}`),
    uniqueIndex("cvs_one_website")
      .on(table.isWebsite)
      .where(sql`${table.isWebsite}`),
  ],
);

/**
 * A timeline entry, a job or a degree, that CVs pick from. Its id and
 * section are fixed once created: CVs refer to the id.
 */
const cvEntries = pgTable(
  "cv_entries",
  {
    /** Stable id, e.g. "mbition"; also the URL slug in the desk. */
    id: text().primaryKey(),
    section: text({ enum: SECTIONS }).notNull(),
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
  },
  (table) => [
    // What cv_entry_picks refers to: an entry and its section.
    unique("cv_entries_id_section_unique").on(table.id, table.section),
    matches("cv_entries_id_check", table.id, SLUG),
    oneOf("cv_entries_section_check", table.section, SECTIONS),
    filled("cv_entries_title_check", table.title),
    filled("cv_entries_organization_check", table.organization),
    matches("cv_entries_from_check", table.from, ISO_MONTH),
    emptyOr("cv_entries_to_check", table.to, ISO_MONTH),
    check("cv_entries_dates_check", sql`${table.to} = '' or ${table.to} >= ${table.from}`),
    jsonArray("cv_entries_bullets_check", table.bullets),
    jsonArray("cv_entries_links_check", table.links),
  ],
);

/** One timeline entry of a CV, with the bullets it prints, in order. */
const cvEntryPicks = pgTable(
  "cv_entry_picks",
  {
    cvId: text()
      .notNull()
      .references(() => cvs.id, { onDelete: "cascade", onUpdate: "cascade" }),
    section: text({ enum: SECTIONS }).notNull(),
    position: integer().notNull(),
    /** A cv_entries id, of an entry in the same section. */
    entryId: text().notNull(),
    /** Bullet ids of that entry, in print order. */
    bullets: text().array().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.cvId, table.section, table.position] }),
    // Deleting an entry takes it out of every CV.
    foreignKey({
      name: "cv_entry_picks_entry_fk",
      columns: [table.entryId, table.section],
      foreignColumns: [cvEntries.id, cvEntries.section],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    oneOf("cv_entry_picks_section_check", table.section, SECTIONS),
    check("cv_entry_picks_position_check", sql`${table.position} >= 0`),
  ],
);

/** A group of skills; the home page shows all, CVs pick which they print. */
const skillGroups = pgTable(
  "skill_groups",
  {
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
  },
  (table) => [
    matches("skill_groups_id_check", table.id, KEY),
    filled("skill_groups_title_check", table.title),
    check("skill_groups_position_check", sql`${table.position} >= 0`),
  ],
);

/** The CV's header: who it is about and how to reach them. A single row, id 1. */
const cvProfile = pgTable(
  "cv_profile",
  {
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
  },
  (table) => [
    check("cv_profile_single_row_check", sql`${table.id} = 1`),
    filled("cv_profile_name_check", table.name),
    jsonArray("cv_profile_links_check", table.links),
  ],
);

/** A project shown on /curriculum when the website CV picks it. */
const projects = pgTable(
  "projects",
  {
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
  },
  (table) => [
    matches("projects_id_check", table.id, SLUG),
    filled("projects_title_check", table.title),
  ],
);

/**
 * A source of job postings, private to the desk: one that sends them (the
 * LinkedIn job alert mails a script in Gmail forwards) or one the desk reads
 * itself (a company's job board). What each type understands is its module
 * in src/server/collectors/.
 */
const collectors = pgTable(
  "collectors",
  {
    /** URL slug, e.g. /desk/collectors/linkedin-alerts and /api/collectors/linkedin-alerts. */
    id: text().primaryKey(),
    type: text({ enum: COLLECTOR_TYPES }).notNull(),
    label: text().notNull(),
    /** A paused collector refuses what is sent to it, and isn't run. */
    active: boolean().notNull().default(true),
    /**
     * SHA-256 (hex) of the secret it is sent with; the secret itself is shown
     * once. Null for a collector the desk runs itself: nothing sends to it.
     */
    secretHash: text(),
    /** The job board an "ats-board" collector reads; null for the others. */
    board: jsonb().$type<AtsBoard>(),
    /** The last time something was sent to it or it ran, and what came of it. */
    lastRunAt: timestamp({ withTimezone: true }),
    lastFound: integer().notNull().default(0),
    lastAdded: integer().notNull().default(0),
    /** Why the last run failed; empty if it didn't. */
    lastError: text().notNull().default(""),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    matches("collectors_id_check", table.id, SLUG),
    oneOf("collectors_type_check", table.type, COLLECTOR_TYPES),
    filled("collectors_label_check", table.label),
    check(
      "collectors_secret_hash_check",
      sql`${table.secretHash} is null or ${table.secretHash} ~ '^[0-9a-f]{64}$'`,
    ),
    // A board is what a pulled collector reads; a pushed one has none.
    check(
      "collectors_board_check",
      sql`(${table.type} = 'ats-board') = (${table.board} is not null)
        and (${table.board} is null or jsonb_typeof(${table.board}) = 'object')`,
    ),
    check("collectors_counts_check", sql`${table.lastFound} >= 0 and ${table.lastAdded} >= 0`),
  ],
);

/**
 * A job ad found by a collector or added by URL: the desk's inbox, private.
 * One per ad: a source's id for it is unique.
 */
const jobPostings = pgTable(
  "job_postings",
  {
    /** URL slug, e.g. /desk/postings/linkedin-4012345678. */
    id: text().primaryKey(),
    /** The collector that found it; null if added by hand. */
    collectorId: text().references(() => collectors.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    /** Where the ad is posted. */
    source: text({ enum: POSTING_SOURCES }).notNull(),
    /** The source's id for it: LinkedIn's job id, the page's URL, or "<board>:<job id>". */
    externalId: text().notNull(),
    url: text().notNull(),
    company: text().notNull().default(""),
    title: text().notNull().default(""),
    location: text().notNull().default(""),
    /** Plain text; empty where the source has none (LinkedIn's mails). */
    description: text().notNull().default(""),
    /** ISO date; empty if the source doesn't say. */
    postedOn: text().notNull().default(""),
    /** Where the work is done; empty if the source doesn't say. */
    workplace: text({ enum: WORKPLACES }).notNull().default(""),
    /** The salary range per year, in whole units of its currency; null if not stated. */
    salaryMin: integer(),
    salaryMax: integer(),
    /** ISO 4217 code, e.g. EUR; empty if no salary is stated. */
    salaryCurrency: text().notNull().default(""),
    status: text({ enum: POSTING_STATUSES }).notNull().default("new"),
    /** What it was read from (a mail's text, a page's JSON-LD), to read again later. */
    raw: text().notNull().default(""),
    /** How well the job fits, 0–100, from the scoring model; null until scored. */
    score: integer(),
    /** Why it fits, and what speaks against it: short lines from the model. */
    scoreReasons: jsonb()
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    scoreConcerns: jsonb()
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** The CV the model would send; empty if none fits better than another. */
    scoreCvId: text().notNull().default(""),
    /** The model that scored it, e.g. "reflection/beam-free", and when. */
    scoreModel: text().notNull().default(""),
    scoredAt: timestamp({ withTimezone: true }),
    /**
     * The same job on the company's own board, whose text filled an empty
     * description (LinkedIn's mails carry none); empty if none was found.
     */
    adTextUrl: text().notNull().default(""),
    /** When the company's boards were searched for the ad's text; null until then. */
    adTextCheckedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.source, table.externalId),
    matches("job_postings_id_check", table.id, SLUG),
    oneOf("job_postings_source_check", table.source, POSTING_SOURCES),
    filled("job_postings_external_id_check", table.externalId),
    matches("job_postings_url_check", table.url, WEB_ADDRESS),
    emptyOr("job_postings_posted_on_check", table.postedOn, ISO_DATE),
    oneOf("job_postings_workplace_check", table.workplace, WORKPLACES),
    ...salaryChecks("job_postings", table),
    oneOf("job_postings_status_check", table.status, POSTING_STATUSES),
    // A score is all or nothing: the number, when and by which model.
    check(
      "job_postings_score_check",
      sql`(${table.score} is null and ${table.scoredAt} is null)
        or (${table.score} between 0 and 100 and ${table.scoredAt} is not null)`,
    ),
    jsonArray("job_postings_score_reasons_check", table.scoreReasons),
    jsonArray("job_postings_score_concerns_check", table.scoreConcerns),
    emptyOr("job_postings_ad_text_url_check", table.adTextUrl, WEB_ADDRESS),
    // A borrowed ad text was found by a search.
    check(
      "job_postings_ad_text_check",
      sql`${table.adTextUrl} = '' or ${table.adTextCheckedAt} is not null`,
    ),
  ],
);

/**
 * What the job search is after, in your own words: places, salary, roles,
 * companies. One row, private to the desk; the scoring model reads it with
 * the CV content.
 */
const jobSearch = pgTable(
  "job_search",
  {
    id: integer().primaryKey().default(1),
    notes: text().notNull().default(""),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("job_search_single_row_check", sql`${table.id} = 1`)],
);

/**
 * A company the postings come from, described once for all of them. Postings
 * find theirs by name: `key` is the name without legal form or punctuation.
 */
const companies = pgTable(
  "companies",
  {
    /** URL slug, e.g. /desk/companies/example-labs. */
    id: text().primaryKey(),
    name: text().notNull(),
    /** companyKey(name): how postings match it. */
    key: text().notNull().unique(),
    field: text({ enum: COMPANY_FIELDS }).notNull().default(""),
    /** ISO 3166 country code; empty if unknown. */
    headquarters: text().notNull().default(""),
    funding: text({ enum: COMPANY_FUNDINGS }).notNull().default(""),
    website: text().notNull().default(""),
    note: text().notNull().default(""),
    /** Its Y Combinator batch, e.g. "W25"; empty if none. Found, not typed. */
    batch: text().notNull().default(""),
    /** Where the facts were found: the YC list, Wikidata, its ads. */
    sources: jsonb()
      .$type<CompanySource[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** When the free sources were last asked; null until the first time. */
    checkedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    matches("companies_id_check", table.id, SLUG),
    filled("companies_name_check", table.name),
    filled("companies_key_check", table.key),
    oneOf("companies_field_check", table.field, COMPANY_FIELDS),
    emptyOr("companies_headquarters_check", table.headquarters, "^[A-Z]{2}$"),
    oneOf("companies_funding_check", table.funding, COMPANY_FUNDINGS),
    emptyOr("companies_website_check", table.website, WEB_ADDRESS),
    emptyOr("companies_batch_check", table.batch, "^[A-Z][0-9]{2}$"),
    jsonArray("companies_sources_check", table.sources),
  ],
);

/** One job applied for, or about to be, private to the desk. */
const applications = pgTable(
  "applications",
  {
    /** URL slug, e.g. /desk/applications/acme-frontend. */
    id: text().primaryKey(),
    company: text().notNull(),
    jobTitle: text().notNull().default(""),
    jobUrl: text().notNull().default(""),
    /** The ad, kept to write against, also after it goes offline. */
    jobDescription: text().notNull().default(""),
    /** Where the job is: a city, remote or hybrid. */
    location: text().notNull().default(""),
    /** Where the work is done; empty if not stated. */
    workplace: text({ enum: WORKPLACES }).notNull().default(""),
    /** The salary range per year, in whole units of its currency; null if not stated. */
    salaryMin: integer(),
    salaryMax: integer(),
    /** ISO 4217 code, e.g. EUR; empty if no salary is stated. */
    salaryCurrency: text().notNull().default(""),
    source: text({ enum: APPLICATION_SOURCES }).notNull().default("other"),
    /** Whether it went out; what happened after goes into the history. */
    status: text({ enum: APPLICATION_STATUSES }).notNull().default("preparing"),
    /** The CV sent with it. */
    cvId: text().references(() => cvs.id, { onDelete: "set null", onUpdate: "cascade" }),
    /** The posting it was created from; its job fields were copied from it. */
    postingId: text().references(() => jobPostings.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
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
  },
  (table) => [
    matches("applications_id_check", table.id, SLUG),
    filled("applications_company_check", table.company),
    oneOf("applications_workplace_check", table.workplace, WORKPLACES),
    ...salaryChecks("applications", table),
    oneOf("applications_source_check", table.source, APPLICATION_SOURCES),
    oneOf("applications_status_check", table.status, APPLICATION_STATUSES),
    emptyOr("applications_applied_on_check", table.appliedOn, ISO_DATE),
    emptyOr("applications_next_step_on_check", table.nextStepOn, ISO_DATE),
    jsonArray("applications_contacts_check", table.contacts),
    jsonArray("applications_events_check", table.events),
    check(
      "applications_sent_check",
      sql`${table.sent} is null or jsonb_typeof(${table.sent}) = 'object'`,
    ),
  ],
);

/**
 * A cover letter for one application, private to the desk. Name and contact
 * details come from cv_profile.
 */
const coverLetters = pgTable(
  "cover_letters",
  {
    /** URL slug, e.g. /desk/cover-letters/acme-frontend. */
    id: text().primaryKey(),
    /**
     * The application it belongs to, which has at most this one letter: its job
     * and its CV, whose role prints under the name. Deleting the application
     * deletes the letter.
     */
    applicationId: text()
      .notNull()
      .unique()
      .references(() => applications.id, { onDelete: "cascade", onUpdate: "cascade" }),
    /** Desk only: how the desk lists it. Never printed. */
    label: text().notNull(),
    /** Desk only: what it is for. Never printed. */
    note: text().notNull().default(""),
    /** Printed above the date when set: a person, an address, one item per line. */
    recipient: text().notNull().default(""),
    /** Sets the date format and the default wording. */
    language: text({ enum: LANGUAGES }).notNull().default("en"),
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
  },
  (table) => [
    matches("cover_letters_id_check", table.id, SLUG),
    filled("cover_letters_label_check", table.label),
    oneOf("cover_letters_language_check", table.language, LANGUAGES),
    emptyOr("cover_letters_letter_date_check", table.letterDate, ISO_DATE),
  ],
);

const cvsRelations = relations(cvs, ({ many }) => ({
  entries: many(cvEntryPicks),
}));

const cvEntryPicksRelations = relations(cvEntryPicks, ({ one }) => ({
  cv: one(cvs, { fields: [cvEntryPicks.cvId], references: [cvs.id] }),
}));

export {
  applications,
  collectors,
  companies,
  coverLetters,
  cvEntries,
  cvProfile,
  cvEntryPicks,
  cvEntryPicksRelations,
  cvs,
  cvsRelations,
  jobPostings,
  jobSearch,
  projects,
  skillGroups,
};
