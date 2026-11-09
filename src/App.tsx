import "./assets/css/main.css";
import { Errored, Loading } from "solid-js";
import { ErrorPage } from "./components/ErrorPage";
import { Router } from "./router";

/** The status a failed render answers with: a thrown HttpError's, or 500. */
function errorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const { status } = error;

    return typeof status === "number" ? status : 500;
  }

  return 500;
}

// @solidjs/meta 1.0 needs no provider: its head registry is ambient.
export default function App() {
  return (
    <Router>
      {(props) => (
        <Errored
          fallback={(error) => (
            <ErrorPage
              status={errorStatus(error)}
              {...(error instanceof Error ? { message: error.message } : {})}
            />
          )}
        >
          <Loading>{props.children}</Loading>
        </Errored>
      )}
    </Router>
  );
}
