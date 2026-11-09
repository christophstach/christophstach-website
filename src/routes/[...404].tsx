import { ErrorPage } from "../components/ErrorPage";
import type { RouteDefinition } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";

// httpStatus() sets the response status during SSR (a no-op in the browser);
// it runs in preload so the status is set before the response head flushes.
export const route = {
  preload: () => {
    httpStatus(404);
  },
} satisfies RouteDefinition;

export default function NotFound() {
  return <ErrorPage status={404} />;
}
