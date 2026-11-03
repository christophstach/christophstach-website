const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});

function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map(Number);

  return monthFormatter.format(new Date(year ?? 0, (month ?? 1) - 1));
}

const DAY_LOCALES = { en: "en-GB", de: "de-DE" };

/** An ISO date in a letter's language, e.g. "2 November 2026" or "2. November 2026". */
function formatDay(isoDate: string, language: keyof typeof DAY_LOCALES): string {
  const [year, month, day] = isoDate.split("-").map(Number);

  return new Intl.DateTimeFormat(DAY_LOCALES[language], { dateStyle: "long" }).format(
    new Date(year ?? 0, (month ?? 1) - 1, day ?? 1),
  );
}

/**
 * A bullet's text split at its links, written as [text](https://…). Bullets are
 * plain text otherwise; the parts are rendered with text interpolation only.
 */
function bulletParts(bullet: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let end = 0;

  for (const link of bullet.matchAll(/\[(?<text>[^\]]+)\]\((?<href>https?:\/\/[^)\s]+)\)/gu)) {
    if (link.index > end) {
      parts.push({ text: bullet.slice(end, link.index) });
    }

    parts.push({ text: link.groups?.text ?? "", href: link.groups?.href });
    end = link.index + link[0].length;
  }

  if (end < bullet.length) {
    parts.push({ text: bullet.slice(end) });
  }

  return parts;
}

/** A URL without its scheme, as printed documents show it. */
function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//u, "");
}

/** Whole months between two ISO month strings; an omitted end means "until today". */
function monthsBetween(from: string, to?: string): number {
  const [fromYear = 0, fromMonth = 1] = from.split("-").map(Number);
  const now = new Date();
  const [toYear = now.getFullYear(), toMonth = now.getMonth() + 1] = to
    ? to.split("-").map(Number)
    : [];

  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** How long ago an ISO timestamp was, e.g. "2 hours ago"; under a minute is "just now". */
function formatRelative(iso: string, now = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  const unit = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size);

  return unit ? relativeFormatter.format(Math.round(seconds / unit[1]), unit[0]) : "just now";
}

export { bulletParts, formatDay, formatMonth, formatRelative, monthsBetween, stripScheme };
