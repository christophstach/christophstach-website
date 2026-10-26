import { getRequestURL, parseCookies } from "h3";
import chromium from "@sparticuz/chromium";
import { launch } from "puppeteer-core";
import { useRuntimeConfig } from "nitropack/runtime";

type H3Event = Parameters<typeof getRequestURL>[0];

// The serverless Chromium build only runs on Linux, so local development on
// another OS points NUXT_CV_PDF_CHROME at a regular Chrome instead.
async function launchOptions(localChrome: string) {
  if (localChrome) {
    return { executablePath: localChrome, args: ["--no-sandbox"] };
  }

  return { executablePath: await chromium.executablePath(), args: chromium.args };
}

interface RenderJob {
  url: string;
  localChrome: string;
  /** Cookies to send with the page request, e.g. the desk session for a private variant. */
  cookies: Record<string, string>;
}

async function render({ url, localChrome, cookies }: RenderJob): Promise<Uint8Array> {
  const browser = await launch({ headless: true, ...(await launchOptions(localChrome)) });

  try {
    const page = await browser.newPage();

    // Cookies are scoped to the page's host, which is all Chrome requests here.
    const { hostname } = new URL(url);

    await browser.setCookie(
      ...Object.entries(cookies).map(([name, value]) => ({ name, value, domain: hostname })),
    );
    await page.goto(url, { waitUntil: "networkidle0" });
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

/**
 * Prints a page of this site to PDF. Pass `withSession` for pages under /desk,
 * so Chrome gets past the desk middleware with the requester's session.
 */
export function renderPdf(event: H3Event, path: string, withSession = false) {
  const url = new URL(path, getRequestURL(event).origin).href;
  let rendering = inFlight.get(url);

  if (!rendering) {
    rendering = renderQueued(
      {
        url,
        localChrome: useRuntimeConfig(event).cvPdfChrome,
        cookies: withSession ? parseCookies(event) : {},
      },
      lastRender,
    );
    inFlight.set(url, rendering);
    lastRender = rendering;
  }

  return rendering;
}
