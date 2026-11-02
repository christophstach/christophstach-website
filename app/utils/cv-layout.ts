// The CV is meant to fill two pages. A page before the last that ends this
// early has a visible gap at the bottom, usually because a whole block moved to
// the next page; a last page this empty holds only a few stray lines.
const MAX_PAGES = 2;
const MIN_FILL = 0.8;
const MIN_LAST_FILL = 0.15;

function percent(fill: number): string {
  return `${Math.round(fill * 100)} %`;
}

/** Pages before the last that end early, i.e. with a gap at the bottom. */
function gapWarnings(fills: number[]): string[] {
  return fills
    .slice(0, -1)
    .flatMap((fill, index) =>
      fill < MIN_FILL
        ? [`Page ${index + 1} ends at ${percent(fill)}: a block moved to the next page.`]
        : [],
    );
}

/** What looks off in a PDF with these page fills (0 to 1 each); empty if nothing. */
function layoutWarnings(fills: number[]): string[] {
  const found = gapWarnings(fills);
  const last = fills.at(-1) ?? 1;

  if (fills.length > MAX_PAGES) {
    found.unshift(`Runs to ${fills.length} pages, ${MAX_PAGES} at most.`);
  }

  if (fills.length > 1 && last < MIN_LAST_FILL) {
    found.push(`Page ${fills.length} holds only ${percent(last)} of the page.`);
  }

  return found;
}

/** A one-line page status for the desk overview, from the last page check. */
function pageStatus(fills: number[]): { tone: "ok" | "warn" | "none"; text: string } {
  if (fills.length === 0) {
    return { tone: "none", text: "not checked" };
  }

  const [warning] = layoutWarnings(fills);

  if (warning) {
    return { tone: "warn", text: warning.split(":")[0]?.replace(/\.$/u, "") ?? warning };
  }

  return { tone: "ok", text: `${fills.length} ${fills.length === 1 ? "page" : "pages"} · fits` };
}

/** What looks off in a cover letter with these page fills: it should fit on one page. */
function letterWarnings(fills: number[]): string[] {
  return fills.length > 1 ? [`Runs to ${fills.length} pages, a letter should fit on one.`] : [];
}

/** A one-line page status for the list of cover letters, from the last page check. */
function letterStatus(fills: number[]): { tone: "ok" | "warn" | "none"; text: string } {
  if (fills.length === 0) {
    return { tone: "none", text: "not checked" };
  }

  return fills.length > 1
    ? { tone: "warn", text: `${fills.length} pages` }
    : { tone: "ok", text: "1 page · fits" };
}

export { layoutWarnings, letterStatus, letterWarnings, pageStatus, percent };
