// Runs before any server-function dispatch. Registering the router as the
// single-flight collector lets an action's response carry the refreshed
// query() data for the page the client shows next.
import { Router } from "./router";
import { configureServerFunctionsServer } from "@solidjs/web/server-functions/server";
import { createFlightDataCollector } from "@solidjs/router/server";

configureServerFunctionsServer({
  collectFlightData: createFlightDataCollector(Router),
});
