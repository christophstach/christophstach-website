import "server-only";

// Turns the HTML that mails and job pages carry into plain lines of text.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  middot: "·",
  bull: "•",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  euro: "€",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
};

/** Decodes HTML entities: named ones the desk meets, and every numeric one. */
function decodeEntities(text: string): string {
  return text.replaceAll(/&(#x[\da-f]+|#\d+|[a-z]+);/giu, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    }

    if (name.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    }

    return NAMED_ENTITIES[name] ?? entity;
  });
}

/**
 * HTML as plain text, one block per line. A link's address follows its text
 * on a line of its own, since collectors read ids from addresses.
 */
function htmlToText(html: string): string {
  const text = html
    .replaceAll(/<(head|style|script|noscript)\b[\s\S]*?<\/\1>/giu, "")
    .replaceAll(/<!--[\s\S]*?-->/gu, "")
    .replaceAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/giu, "\n$2\n$1\n")
    .replaceAll(/<br\s*\/?>/giu, "\n")
    .replaceAll(/<\/(p|div|tr|td|th|li|h[1-6]|table|section|article|ul|ol)>/giu, "\n")
    .replaceAll(/<li\b[^>]*>/giu, "\n• ")
    .replaceAll(/<[^>]+>/gu, "");

  return tidyLines(decodeEntities(text));
}

/** Trims every line, squeezes inner spaces and keeps at most one empty line in a row. */
function tidyLines(text: string): string {
  return text
    .split(/\r?\n/u)
    .map((line) => line.replaceAll(/[ \t ]+/gu, " ").trim())
    .join("\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();
}

export { decodeEntities, htmlToText, tidyLines };
