// The router lives in its own module so src/App.tsx (render) and
// src/server-config.ts (single-flight collector) share one instance.
import { createRouter, intentPreload } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";
import { pageRoutes } from "virtual:file-routes";
import { registerPaths } from "./route-paths";

export const Router = createRouter({
  routes: fileRoutes(pageRoutes),
  preloadLinks: intentPreload(),
});

export const { paths } = Router;

// For server pages, which can't import this module (see src/route-paths.ts).
registerPaths(paths);
