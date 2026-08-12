// Generates public/christoph-stach-cv.pdf from the prerendered /cv-print route.
// Serves .output/public over a local HTTP server (so absolute /_nuxt, font and CSS
// URLs resolve) and drives headless Chrome's --print-to-pdf. Zero runtime deps.
import { extname, join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const ROOT = ".output/public";
const ROUTE = "/cv-print";
const OUT = "public/christoph-stach-cv.pdf";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  return candidates.find((path) => existsSync(path));
}

if (!existsSync(ROOT)) {
  console.error(`[cv-pdf] ${ROOT} not found — run \`nuxt generate\` first.`);
  process.exit(1);
}

const chrome = findChrome();

if (!chrome) {
  console.error("[cv-pdf] Chrome not found. Set CHROME_BIN or install google-chrome.");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let filePath = join(ROOT, pathname);

    if (!extname(filePath)) {
      filePath = join(filePath, "index.html");
    }

    const data = await readFile(filePath);

    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const { port } = server.address();
const url = `http://127.0.0.1:${port}${ROUTE}`;

console.log(`[cv-pdf] Rendering ${url} → ${OUT}`);

const exitCode = await new Promise((resolve) => {
  const proc = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${OUT}`,
      url,
    ],
    { stdio: "inherit" },
  );

  proc.on("exit", resolve);
});

server.close();

if (exitCode !== 0) {
  console.error(`[cv-pdf] Chrome exited with code ${exitCode}`);
  process.exit(1);
}

let size = 0;

try {
  ({ size } = await stat(OUT));
} catch {
  // Left at 0, reported as a failure below.
}

if (size === 0) {
  console.error("[cv-pdf] PDF was not produced.");
  process.exit(1);
}

console.log(`[cv-pdf] Done: ${OUT} (${Math.round(size / 1024)} KB)`);
