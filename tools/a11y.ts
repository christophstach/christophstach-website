// Runs axe (WCAG 2.1 AA plus best practices) on the public pages, once in the
// light and once in the dark theme, so contrast is checked in both.
// Start the dev server first, then: pnpm a11y [base URL]
import type { AxeResults, Result } from "axe-core";
import { createRequire } from "node:module";
import { launch } from "puppeteer-core";
import { readFileSync } from "node:fs";

declare global {
  interface Window {
    axe: typeof import("axe-core");
  }
}

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const CHROME = process.env.CV_PDF_CHROME_PATH ?? "/usr/bin/google-chrome";
// shortcut: hand-kept list (a script can't import the typed router), add new public pages here.
const PAGES = ["/", "/curriculum", "/login", "/cv-print", "/no-such-page"];
const MODES = ["light", "dark"] as const;

const axeSource = readFileSync(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
);

function report(label: string, violations: Result[]) {
  if (violations.length === 0) {
    process.stdout.write(`ok    ${label}\n`);
    return;
  }

  process.stdout.write(`FAIL  ${label}\n`);

  for (const violation of violations) {
    process.stdout.write(`      [${violation.impact ?? "?"}] ${violation.id}: ${violation.help}\n`);
    // What axe measured, e.g. the contrast ratio and both colors.
    process.stdout.write(`      ${violation.nodes[0]?.any[0]?.message ?? ""}\n`);

    for (const node of violation.nodes.slice(0, 5)) {
      process.stdout.write(`        ${node.target.join(" ")}\n`);
    }

    if (violation.nodes.length > 5) {
      process.stdout.write(`        … ${violation.nodes.length - 5} more\n`);
    }
  }
}

const browser = await launch({ executablePath: CHROME, args: ["--no-sandbox"] });

/** One page in one theme; each theme gets its own browser context for its cookie. */
async function check(mode: (typeof MODES)[number], path: string): Promise<AxeResults> {
  const context = await browser.createBrowserContext();

  await context.setCookie({ name: "color-mode", value: mode, domain: new URL(BASE_URL).hostname });
  const page = await context.newPage();

  // Reveal animations would be measured half-faded; reduced motion turns them off.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

  await page.goto(new URL(path, BASE_URL).href, { waitUntil: "networkidle0" });
  await page.addScriptTag({ content: axeSource });

  return page.evaluate(() =>
    window.axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
    }),
  );
}

try {
  const runs = MODES.flatMap((mode) => PAGES.map((path) => ({ mode, path })));
  const results = await Promise.all(runs.map((run) => check(run.mode, run.path)));

  for (const [index, run] of runs.entries()) {
    report(`${run.path} (${run.mode})`, results[index]?.violations ?? []);
  }

  process.exitCode = results.some((result) => result.violations.length > 0) ? 1 : 0;
} finally {
  await browser.close();
}
