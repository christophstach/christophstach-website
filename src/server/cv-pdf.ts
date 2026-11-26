import "server-only";
import { Deferred, Effect, Semaphore } from "effect";
import { COLOR_MODE_COOKIE } from "../lib/color-mode";
import chromium from "@sparticuz/chromium";
import { env } from "virtual:solid-env/server";
import { launch } from "puppeteer-core";
import { ExternalFetchError, PdfRenderError, runServerEffect } from "./effect";

// The serverless Chromium build only runs on Linux, so local development on
// another OS points CV_PDF_CHROME_PATH at a regular Chrome instead.
function launchOptionsEffect(
  localChrome: string | undefined,
): Effect.Effect<{ executablePath: string; args: string[] }, PdfRenderError> {
  if (localChrome !== undefined) {
    return Effect.succeed({ executablePath: localChrome, args: ["--no-sandbox"] });
  }

  return Effect.tryPromise({
    try: async () => ({ executablePath: await chromium.executablePath(), args: chromium.args }),
    catch: (cause) =>
      new PdfRenderError({
        message: "Failed to resolve Chromium executable for PDF rendering.",
        cause,
      }),
  });
}

interface RenderJob {
  url: string;
  /** Cookies to send with the page request, e.g. the desk session for a private CV. */
  cookies: Map<string, string>;
}

function renderEffect({ url, cookies }: RenderJob): Effect.Effect<Uint8Array, PdfRenderError> {
  return Effect.scoped(
    Effect.gen(function* () {
      const options = yield* launchOptionsEffect(env.CV_PDF_CHROME_PATH);
      const browser = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => launch({ headless: true, ...options }),
          catch: (cause) =>
            new PdfRenderError({
              message: "Failed to launch headless browser for PDF rendering.",
              cause,
            }),
        }),
        (instance) =>
          Effect.tryPromise({
            try: () => instance.close(),
            catch: (cause) =>
              new PdfRenderError({
                message: "Failed to close headless browser after PDF rendering.",
                cause,
              }),
          }).pipe(Effect.ignore({ log: "Warn" })),
      );

      const page = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => browser.newPage(),
          catch: (cause) =>
            new PdfRenderError({
              message: "Failed to open browser page for PDF rendering.",
              cause,
            }),
        }),
        (tab) =>
          Effect.tryPromise({
            try: () => tab.close(),
            catch: (cause) =>
              new PdfRenderError({
                message: "Failed to close browser page after PDF rendering.",
                cause,
              }),
          }).pipe(Effect.ignore({ log: "Warn" })),
      );

      // Cookies are scoped to the page's host, which is all Chrome requests here.
      const { hostname } = new URL(url);

      yield* Effect.tryPromise({
        try: () =>
          browser.setCookie(
            ...[...cookies].map(([name, value]) => ({ name, value, domain: hostname })),
          ),
        catch: (cause) =>
          new PdfRenderError({
            message: "Failed to configure browser cookies for PDF rendering.",
            cause,
          }),
      });

      const response = yield* Effect.tryPromise({
        try: () => page.goto(url, { waitUntil: "networkidle0" }),
        catch: (cause) =>
          new PdfRenderError({
            message: "Failed to load print page for PDF rendering.",
            cause,
          }),
      });

      // ISR would cache whatever got printed, a login or error page included.
      if (response === null || !response.ok()) {
        return yield* new PdfRenderError({
          message: `${url} answered ${response?.status() ?? "nothing"}.`,
        });
      }

      yield* Effect.tryPromise({
        try: () => page.evaluate("document.fonts.ready"),
        catch: (cause) =>
          new PdfRenderError({
            message: "Failed while waiting for fonts before PDF rendering.",
            cause,
          }),
      });

      // Paper size and margins come from the page's own @page rule.
      return yield* Effect.tryPromise({
        try: () => page.pdf({ preferCSSPageSize: true, printBackground: true }),
        catch: (cause) =>
          new PdfRenderError({
            message: "Failed to print page to PDF.",
            cause,
          }),
      });
    }),
  );
}

// One Chrome at a time per instance. On a cold start the first render is still
// unpacking Chromium, and a second launch of the half-written binary fails
// (spawn ETXTBSY); the desk asks for several PDFs at once. Requests for a page
// that is already rendering share that render.
const renderSemaphore = Semaphore.makeUnsafe(1);
const inFlight = new Map<string, Deferred.Deferred<Uint8Array, PdfRenderError>>();

/** The request's cookies by name. */
function requestCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();

  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");

    if (separator > 0) {
      cookies.set(
        part.slice(0, separator).trim(),
        decodeURIComponent(part.slice(separator + 1).trim()),
      );
    }
  }

  return cookies;
}

/** Previews sit behind Vercel's deployment protection; its cookie lets Chrome in. */
function previewAccess(request: Request): Map<string, string> {
  const access = requestCookies(request).get("_vercel_jwt");

  return new Map(access === undefined ? [] : [["_vercel_jwt", access]]);
}

/**
 * Prints a page of this site to PDF as an Effect. Pass `withSession` for pages
 * under /desk, so Chrome gets past the desk guard with the requester's session.
 */
export function renderPdfEffect(
  request: Request,
  path: string,
  withSession = false,
): Effect.Effect<Uint8Array, PdfRenderError> {
  return Effect.uninterruptibleMask((restore) =>
    Effect.suspend(() => {
      const url = new URL(path, request.url).href;
      const existing = inFlight.get(url);

      if (existing !== undefined) {
        return restore(Deferred.await(existing));
      }

      const deferred = Deferred.makeUnsafe<Uint8Array, PdfRenderError>();
      const cookies = withSession ? requestCookies(request) : previewAccess(request);

      // Paper is printed light, whatever theme the requester browses in.
      cookies.set(COLOR_MODE_COOKIE, "light");
      inFlight.set(url, deferred);

      return restore(renderSemaphore.withPermits(1)(renderEffect({ url, cookies }))).pipe(
        Effect.onExit((exit) =>
          Effect.sync(() => {
            if (inFlight.get(url) === deferred) {
              inFlight.delete(url);
            }
          }).pipe(Effect.andThen(Deferred.done(deferred, exit))),
        ),
      );
    }),
  );
}

/**
 * Prints a page of this site to PDF. Pass `withSession` for pages under /desk,
 * so Chrome gets past the desk guard with the requester's session.
 */
export function renderPdf(
  request: Request,
  path: string,
  withSession = false,
): Promise<Uint8Array> {
  return runServerEffect(renderPdfEffect(request, path, withSession));
}

const REVALIDATE_CONCURRENCY = 4;

/**
 * Renews cached public responses after a change, e.g. the CV PDF or the data
 * /curriculum shows. On Vercel they are cached until the next deployment
 * (ISR); a request with the bypass token renders them again now. Without a
 * token (local, or not set up) the cache stays until the next deployment.
 */
export function revalidatePathsEffect(
  request: Request,
  paths: ReadonlyArray<string>,
): Effect.Effect<void, ExternalFetchError> {
  const token = env.ISR_BYPASS_TOKEN;

  if (token === undefined || paths.length === 0) {
    return Effect.void;
  }

  return Effect.forEach(
    paths,
    (path) => {
      const url = new URL(path, request.url);

      return Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(url, {
              method: "HEAD",
              headers: { "x-prerender-revalidate": token },
            }),
          catch: (cause) =>
            new ExternalFetchError({
              message: `Failed to revalidate cached path ${path}.`,
              url: url.href,
              cause,
            }),
        });

        if (!response.ok) {
          yield* Effect.logWarning(
            `ISR revalidation for ${path} answered ${response.status} ${response.statusText}.`,
          );
        }
      });
    },
    { concurrency: REVALIDATE_CONCURRENCY, discard: true },
  );
}

/**
 * Renews cached public responses after a change, e.g. the CV PDF or the data
 * /curriculum shows. On Vercel they are cached until the next deployment
 * (ISR); a request with the bypass token renders them again now. Without a
 * token (local, or not set up) the cache stays until the next deployment.
 */
export function revalidatePaths(request: Request, paths: string[]): Promise<void> {
  return runServerEffect(revalidatePathsEffect(request, paths));
}
