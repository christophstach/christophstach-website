import "./assets/css/main.css";
import { Errored, Loading, untrack } from "solid-js";
import { useLocation } from "@solidjs/router";
import { ErrorPage } from "./components/ErrorPage";
import { Router } from "./router";
import { reloadForStaleBuild } from "./lib/stale-build";

/** The status a failed render answers with: a thrown HttpError's, or 500. */
function errorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const { status } = error;

    return typeof status === "number" ? status : 500;
  }

  return 500;
}

/** The error page's message prop: a thrown Error's message, or none. */
function errorMessage(error: unknown): { message?: string } {
  return error instanceof Error ? { message: error.message } : {};
}

// @solidjs/meta 1.0 needs no provider: its head registry is ambient.
export default function App() {
  return (
    <Router>
      {(props) => (
        // Errored inside Loading: a render error then ends the boundary with
        // the error page instead of failing the streamed fragment, which the
        // client would have to rebuild without the route's code.
        <Loading>
          <Errored
            // `error` is an accessor (Solid 2), not the thrown value.
            // A tab left open across a deploy reloads onto the new build instead.
            fallback={(error) => {
              const location = useLocation();
              const target = untrack(() => location.pathname + location.search + location.hash);

              return reloadForStaleBuild(error(), target) ? null : (
                <ErrorPage status={errorStatus(error())} {...errorMessage(error())} />
              );
            }}
          >
            {props.children}
          </Errored>
        </Loading>
      )}
    </Router>
  );
}
