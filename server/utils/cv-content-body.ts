import type { EntryRecord, SkillGroup, TimelineLink } from "../../app/data/cv";
import { createError } from "h3";

// URL slug: lowercase words joined by single hyphens, e.g. "mbition".
const ENTRY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// Bullet and skill group ids, e.g. "agent-platform" or "backend_api".
const KEY = /^[a-z0-9][a-z0-9_-]*$/u;
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const SECTIONS = new Set(["experience", "education"]);

function invalid(message: string) {
  return createError({ statusCode: 400, message });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Trimmed, without empty items. */
function cleanList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

function unique(ids: string[], what: string) {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      throw invalid(`The ${what} id "${id}" is used twice.`);
    }

    seen.add(id);
  }
}

function parseBullets(value: unknown): EntryRecord["bullets"] {
  if (!Array.isArray(value)) {
    throw invalid("Bullets must be a list.");
  }

  const bullets = value.map((item: Partial<{ id: unknown; text: unknown }> | null) => {
    if (typeof item?.id !== "string" || !KEY.test(item.id) || !isText(item.text)) {
      throw invalid("Every bullet needs an id and some text.");
    }

    return { id: item.id, text: item.text.trim() };
  });

  unique(
    bullets.map((bullet) => bullet.id),
    "bullet",
  );

  return bullets;
}

function parseLinks(value: unknown): TimelineLink[] {
  if (!Array.isArray(value)) {
    throw invalid("Links must be a list.");
  }

  return value.map((item: Partial<{ text: unknown; href: unknown }> | null) => {
    if (!isText(item?.text) || !isText(item?.href)) {
      throw invalid("Every link needs a text and an address.");
    }

    return { text: item.text.trim(), href: item.href.trim() };
  });
}

function checkEntryFields(value: Partial<EntryRecord>) {
  if (!SECTIONS.has(String(value.section))) {
    throw invalid("Section must be experience or education.");
  }

  if (!isText(value.title) || !isText(value.organization)) {
    throw invalid("An entry needs a title and an organization.");
  }

  if (!MONTH.test(String(value.from)) || !(value.to === "" || MONTH.test(String(value.to)))) {
    throw invalid('Dates are months like "2023-10"; an empty end means ongoing.');
  }

  if (typeof value.location !== "string" || !isStringArray(value.tech)) {
    throw invalid("Not a CV entry.");
  }
}

/** Checks a timeline entry sent by the desk; the route's id wins. */
function parseEntryBody(id: string, body: unknown): EntryRecord {
  const value = (body ?? {}) as Partial<EntryRecord>;

  if (!ENTRY_ID.test(id)) {
    throw invalid(`"${id}" is no valid id: use lowercase letters, digits and hyphens.`);
  }

  checkEntryFields(value);

  const entry = value as EntryRecord;

  return {
    id,
    section: entry.section,
    title: entry.title.trim(),
    organization: entry.organization.trim(),
    location: entry.location.trim(),
    from: entry.from,
    to: entry.to,
    tech: cleanList(entry.tech),
    bullets: parseBullets(entry.bullets),
    links: parseLinks(entry.links),
  };
}

/** Checks the full, ordered list of skill groups sent by the desk. */
function parseSkillGroupsBody(body: unknown): SkillGroup[] {
  if (!Array.isArray(body)) {
    throw invalid("Skill groups must be a list.");
  }

  const groups = body.map((item: Partial<SkillGroup> | null) => {
    if (typeof item?.label !== "string" || !KEY.test(item.label) || !isText(item.title)) {
      throw invalid("Every skill group needs an id and a title.");
    }

    if (!isStringArray(item.items)) {
      throw invalid("Skills must be a list.");
    }

    return { label: item.label, title: item.title.trim(), items: cleanList(item.items) };
  });

  unique(
    groups.map((group) => group.label),
    "skill group",
  );

  return groups;
}

export { parseEntryBody, parseSkillGroupsBody };
