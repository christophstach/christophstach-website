import "server-only";
import { COLOR_MODE_COOKIE } from "../lib/color-mode";
import chromium from "@sparticuz/chromium";
import { env } from "virtual:solid-env/server";
import { launch } from "puppeteer-core";

// The serverless Chromium build only runs on Linux, so local development on
// another OS points CV_PDF_CHROME_PATH at a regular Chrome instead.
async function launchOptions(localChrome: string | undefined) {
  if (localChrome !== undefined) {
    return { executablePath: localChrome, args: ["--no-sandbox"] };
  }

  return { executablePath: await chromium.executablePath(), args: chromium.args };
}

interface RenderJob {
  url: string;
  /** Cookies to send with the page request, e.g. the desk session for a private CV. */
  cookies: Map<string, string>;
}

async function render({ url, cookies }: RenderJob): Promise<Uint8Array> {
  const browser = await launch({
    headless: true,
    ...(await launchOptions(env.CV_PDF_CHROME_PATH)),
  });

  try {
    const page = await browser.newPage();

    // Cookies are scoped to the page's host, which is all Chrome requests here.
    const { hostname } = new URL(url);

    await browser.setCookie(
      ...[...cookies].map(([name, value]) => ({ name, value, domain: hostname })),
    );
    const response = await page.goto(url, { waitUntil: "networkidle0" });

    // ISR would cache whatever got printed, a login or error page included.
    if (response === null || !response.ok()) {
      throw new Error(`${url} answered ${response?.status() ?? "nothing"}.`);
    }

    await page.evaluate("document.fonts.ready");

    // Paper size and margins come from the page's own @page rule.
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}

// One Chrome at a time per instance. On a cold start the first render is still
// unpacking Chromium, and a second launch of the half-written binary fails
// (spawn ETXTBSY); the desk asks for several PDFs at once. Requests for a page
// that is already rendering share that render.
const inFlight = new Map<string, Promise<Uint8Array>>();
let lastRender: Promise<unknown> = Promise.resolve();

async function renderQueued(job: RenderJob, previous: Promise<unknown>) {
  try {
    await Promise.allSettled([previous]);

    return await render(job);
  } finally {
    inFlight.delete(job.url);
  }
}

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
 * Prints a page of this site to PDF. Pass `withSession` for pages under /desk,
 * so Chrome gets past the desk guard with the requester's session.
 */
export function renderPdf(request: Request, path: string, withSession = false) {
  const url = new URL(path, request.url).href;
  let rendering = inFlight.get(url);

  if (rendering === undefined) {
    const cookies = withSession ? requestCookies(request) : previewAccess(request);

    // Paper is printed light, whatever theme the requester browses in.
    cookies.set(COLOR_MODE_COOKIE, "light");
    rendering = renderQueued({ url, cookies }, lastRender);
    inFlight.set(url, rendering);
    lastRender = rendering;
  }

  return rendering;
}

/**
 * Renews cached public responses after a change, e.g. the CV PDF or the data
 * /curriculum shows. On Vercel they are cached until the next deployment
 * (ISR); a request with the bypass token renders them again now. Without a
 * token (local, or not set up) the cache stays until the next deployment.
 */
export async function revalidatePaths(request: Request, paths: string[]) {
  const token = env.ISR_BYPASS_TOKEN;

  if (token === undefined) {
    return;
  }

  await Promise.all(
    paths.map((path) =>
      fetch(new URL(path, request.url), {
        method: "HEAD",
        headers: { "x-prerender-revalidate": token },
      }),
    ),
  );
}
