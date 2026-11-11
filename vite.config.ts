/// <reference types="node" />
import { defineConfig } from "vite";
import { fileRoutes } from "filesystem-routing/vite";
import { PAGE_CHECKS_API_PATH } from "./src/data/endpoints";
import { nitro } from "nitro/vite";
import solid from "@solidjs/vite-plugin";

// Names the build; Vercel sets the deployment ID, local builds get a timestamp.
const buildId =
  process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36);

export default defineConfig({
  plugins: [
    solid({
      // SSR with no entry files: the plugin wraps src/App.tsx in
      // src/Document.tsx. env.ts is picked up by convention.
      // Complete documents, not streams: head tags of async pages (titles, link
      // previews) must be in the first byte for crawlers, and a redirect while
      // rendering becomes a real 3xx.
      start: { middleware: "./src/middleware.ts", renderMode: "async" },
      ssr: true,
      // Dev-only: answers POST /__solid/diagnostics.
      diagnostics: true,
      serverFunctions: { serverSetup: "./src/server-config.ts", components: true },
      // Also compile the `?pick=` route modules fileRoutes emits.
      extensions: [".jsx", ".tsx"],
    }),
    // httpMethods: route modules may export GET/POST/... (API routes).
    fileRoutes({ httpMethods: true, types: true, serverComponents: true }),
    // Nitro serves the Solid handler and writes .vercel/output. serverDir
    // stays off (Nitro's default): server/ only holds the database schema.
    nitro({
      preset: "vercel",
      serverDir: false,
      // Chromium unpacks its binary from the package's bin/ folder at runtime,
      // which import tracing alone doesn't copy: ship the whole package.
      traceDeps: ["@sparticuz/chromium*"],
      routeRules: {
        // The public data and the CV PDF are cached (ISR) until the next
        // deployment or until the desk changes them (on-demand revalidation
        // with the bypass token). The pages that read the data render per
        // request, so they can honour the color-mode cookie.
        "/api/cv-home": { isr: true },
        "/api/cv-website": { isr: true },
        "/christoph-stach-cv.pdf": { isr: true },
        "/about-me": { redirect: { to: "/", status: 301 } },
        "/cv-print": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
        "/desk/**": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
        "/login": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
      },
      vercel: {
        // Read at build time: Vercel only revalidates ISR routes on demand for
        // requests carrying this token (see revalidatePaths).
        config: {
          version: 3,
          ...(process.env.ISR_BYPASS_TOKEN === undefined
            ? {}
            : { bypassToken: process.env.ISR_BYPASS_TOKEN }),
          // Measures the pages of every CV and cover letter without a
          // page check on this build, so nobody has to open the desk for it.
          // Daily, the shortest interval every Vercel plan allows; Vercel calls
          // it with CRON_SECRET.
          crons: [{ path: PAGE_CHECKS_API_PATH, schedule: "0 4 * * *" }],
        },
        functions: {
          // The CV PDF unpacks and starts Chromium on a cold start, which can
          // outlast the default function timeout.
          maxDuration: 60,
        },
      },
    }),
  ],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
