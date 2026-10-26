// Renders the CV PDF from the prerendered /cv-print page on request, so it always
// matches the current CV data. On Vercel the response is cached (ISR, see
// routeRules), so Chrome only runs once per deployment, not once per download.
import { defineEventHandler, getRequestURL, setResponseHeaders } from "h3";
import chromium from "@sparticuz/chromium";
import { launch } from "puppeteer-core";
import { useRuntimeConfig } from "nitropack/runtime";

// The serverless Chromium build only runs on Linux, so local development on
// another OS points NUXT_CV_PDF_CHROME at a regular Chrome instead.
async function launchOptions(localChrome: string) {
  if (localChrome) {
    return { executablePath: localChrome, args: ["--no-sandbox"] };
  }

  return { executablePath: await chromium.executablePath(), args: chromium.args };
}

async function render(url: string, localChrome: string): Promise<Uint8Array> {
  const browser = await launch({ headless: true, ...(await launchOptions(localChrome)) });

  try {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate("document.fonts.ready");

    // Paper size and margins come from the page's own @page rule.
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}

// Requests that arrive while a render runs wait for it instead of starting
// their own. On a cold start the first one is still unpacking Chromium, and a
// second launch of the half-written binary fails (spawn ETXTBSY). After a
// deploy that is the common case: the desk loads the PDF twice at once.
const inFlight = new Map<string, Promise<Uint8Array>>();

async function renderOnce(url: string, localChrome: string): Promise<Uint8Array> {
  try {
    return await render(url, localChrome);
  } finally {
    inFlight.delete(url);
  }
}

export default defineEventHandler(async (event) => {
  const url = new URL("/cv-print", getRequestURL(event).origin).href;
  let rendering = inFlight.get(url);

  if (!rendering) {
    rendering = renderOnce(url, useRuntimeConfig(event).cvPdfChrome);
    inFlight.set(url, rendering);
  }

  const pdf = await rendering;

  setResponseHeaders(event, {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="christoph-stach-cv.pdf"',
  });

  return pdf;
});
