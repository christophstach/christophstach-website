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

export default defineEventHandler(async (event) => {
  const url = new URL("/cv-print", getRequestURL(event).origin).href;
  const browser = await launch({
    headless: true,
    ...(await launchOptions(useRuntimeConfig(event).cvPdfChrome)),
  });

  try {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate("document.fonts.ready");

    // Paper size and margins come from the page's own @page rule.
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });

    setResponseHeaders(event, {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="christoph-stach-cv.pdf"',
    });

    return pdf;
  } finally {
    await browser.close();
  }
});
