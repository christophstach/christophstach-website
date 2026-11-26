// Runs axe (WCAG 2.1 AA plus best practices) on the public pages, once in the
// light and once in the dark theme, so contrast is checked in both.
// Start the dev server first, then: pnpm a11y [base URL]
import type { AxeResults, Result as AxeViolation } from "axe-core";
import { Cause, Data, Effect, Exit, Result } from "effect";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Browser, BrowserContext } from "puppeteer-core";
import { launch } from "puppeteer-core";

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

type Mode = (typeof MODES)[number];

interface AuditRun {
  readonly mode: Mode;
  readonly path: string;
}

interface AuditOutcome {
  readonly run: AuditRun;
  readonly results: AxeResults;
}

class A11yBrowserError extends Data.TaggedError("A11yBrowserError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

class A11yAuditError extends Data.TaggedError("A11yAuditError")<{
  readonly message: string;
  readonly path?: string | undefined;
  readonly mode?: Mode | undefined;
  readonly cause?: unknown;
}> {}

class A11yViolationsError extends Data.TaggedError("A11yViolationsError")<{
  readonly message: string;
  readonly failedRuns: number;
  readonly totalViolations: number;
}> {}

const loadAxeSource = Effect.try({
  try: () => readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8"),
  catch: (cause) =>
    new A11yAuditError({
      message: "Failed to load axe-core script.",
      cause,
    }),
});

function parseBaseUrl(rawUrl: string): Effect.Effect<URL, A11yAuditError> {
  return Effect.try({
    try: () => new URL(rawUrl),
    catch: (cause) =>
      new A11yAuditError({
        message: `Invalid base URL: ${rawUrl}`,
        cause,
      }),
  });
}

function report(label: string, violations: readonly AxeViolation[]) {
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

const acquireBrowser = Effect.acquireRelease(
  Effect.tryPromise({
    try: () => launch({ executablePath: CHROME, args: ["--no-sandbox"] }),
    catch: (cause) =>
      new A11yBrowserError({
        message: `Failed to launch Chromium at ${CHROME}.`,
        cause,
      }),
  }),
  (browser) =>
    Effect.ignore(
      Effect.tryPromise({
        try: () => browser.close(),
        catch: (cause) =>
          new A11yBrowserError({
            message: "Failed to close Chromium browser.",
            cause,
          }),
      }),
    ),
);

function acquireContext(browser: Browser, run: AuditRun) {
  return Effect.acquireRelease(
    Effect.tryPromise({
      try: () => browser.createBrowserContext(),
      catch: (cause) =>
        new A11yBrowserError({
          message: `Failed to create browser context for ${run.path} (${run.mode}).`,
          cause,
        }),
    }),
    (context) =>
      Effect.ignore(
        Effect.tryPromise({
          try: () => context.close(),
          catch: (cause) =>
            new A11yBrowserError({
              message: `Failed to close browser context for ${run.path} (${run.mode}).`,
              cause,
            }),
        }),
      ),
  );
}

function acquirePage(context: BrowserContext, run: AuditRun) {
  return Effect.acquireRelease(
    Effect.tryPromise({
      try: () => context.newPage(),
      catch: (cause) =>
        new A11yBrowserError({
          message: `Failed to open browser page for ${run.path} (${run.mode}).`,
          cause,
        }),
    }),
    (page) =>
      Effect.ignore(
        Effect.tryPromise({
          try: () => page.close(),
          catch: (cause) =>
            new A11yBrowserError({
              message: `Failed to close browser page for ${run.path} (${run.mode}).`,
              cause,
            }),
        }),
      ),
  );
}

/** One page in one theme; each theme gets its own browser context for its cookie. */
function check(
  browser: Browser,
  axeSource: string,
  baseUrl: URL,
  run: AuditRun,
): Effect.Effect<AuditOutcome, A11yBrowserError | A11yAuditError> {
  return Effect.scoped(
    Effect.gen(function* () {
      const context = yield* acquireContext(browser, run);

      yield* Effect.tryPromise({
        try: () =>
          context.setCookie({
            name: "color-mode",
            value: run.mode,
            domain: baseUrl.hostname,
          }),
        catch: (cause) =>
          new A11yBrowserError({
            message: `Failed to set color-mode cookie for ${run.path} (${run.mode}).`,
            cause,
          }),
      });

      const page = yield* acquirePage(context, run);
      const targetUrl = new URL(run.path, baseUrl).href;

      // Reveal animations would be measured half-faded; reduced motion turns them off.
      yield* Effect.tryPromise({
        try: () => page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]),
        catch: (cause) =>
          new A11yBrowserError({
            message: `Failed to emulate reduced motion for ${run.path} (${run.mode}).`,
            cause,
          }),
      });

      yield* Effect.tryPromise({
        try: () => page.goto(targetUrl, { waitUntil: "networkidle0" }),
        catch: (cause) =>
          new A11yAuditError({
            message: `Failed to navigate to ${targetUrl} (${run.mode}).`,
            path: run.path,
            mode: run.mode,
            cause,
          }),
      });

      yield* Effect.tryPromise({
        try: () => page.addScriptTag({ content: axeSource }),
        catch: (cause) =>
          new A11yAuditError({
            message: `Failed to inject axe-core into ${run.path} (${run.mode}).`,
            path: run.path,
            mode: run.mode,
            cause,
          }),
      });

      const results = yield* Effect.tryPromise({
        try: () =>
          page.evaluate(() =>
            window.axe.run(document, {
              runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
            }),
          ),
        catch: (cause) =>
          new A11yAuditError({
            message: `Failed to run axe audit on ${run.path} (${run.mode}).`,
            path: run.path,
            mode: run.mode,
            cause,
          }),
      });

      return { run, results };
    }),
  );
}

const program = Effect.scoped(
  Effect.gen(function* () {
    const baseUrl = yield* parseBaseUrl(BASE_URL);
    const axeSource = yield* loadAxeSource;
    const browser = yield* acquireBrowser;

    const runs: readonly AuditRun[] = MODES.flatMap((mode) =>
      PAGES.map((path) => ({ mode, path })),
    );

    const outcomes = yield* Effect.forEach(runs, (run) => check(browser, axeSource, baseUrl, run), {
      concurrency: "unbounded",
    });

    let failedRuns = 0;
    let totalViolations = 0;

    for (const { run, results } of outcomes) {
      yield* Effect.sync(() => {
        report(`${run.path} (${run.mode})`, results.violations);
      });

      if (results.violations.length > 0) {
        failedRuns += 1;
        totalViolations += results.violations.length;
      }
    }

    if (failedRuns > 0) {
      return yield* new A11yViolationsError({
        message: `Found ${totalViolations} accessibility violation(s) across ${failedRuns} page run(s).`,
        failedRuns,
        totalViolations,
      });
    }

    return outcomes;
  }),
);

const exit = await Effect.runPromiseExit(program);

if (Exit.isFailure(exit)) {
  const failure = Cause.findError(exit.cause);

  if (Result.isFailure(failure) || failure.success._tag !== "A11yViolationsError") {
    process.stderr.write(`${Cause.pretty(exit.cause)}\n`);
  }

  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
