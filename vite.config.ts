/// <reference types="node" />
import { defineConfig } from "vite";
import { fileRoutes } from "filesystem-routing/vite";
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
    // stays off (Nitro's default) so it never scans the Nuxt server/.
    nitro({ preset: "vercel", serverDir: false }),
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
