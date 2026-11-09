// The server middleware chain, in front of page renders, server functions
// and API routes. createAPIHandler serves the GET/POST/... exports of route
// modules and passes everything else down the chain.
import type { StartMiddleware } from "@solidjs/vite-plugin";
import { createAPIHandler } from "filesystem-routing/api";
import routes from "virtual:file-routes";

export default [createAPIHandler(routes)] satisfies StartMiddleware[];
