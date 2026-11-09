import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { IconArrowRight } from "./icons";
import { SiteMeta } from "../seo";
import { httpStatus } from "@solidjs/web";
import layout from "./SiteLayout.module.css";
import { paths } from "../router";
import styles from "./ErrorPage.module.css";
import { useLocation } from "@solidjs/router";

interface ErrorPageProps {
  status: number;
  /** What went wrong; a 404 shows a shell's "No such file or directory" instead. */
  message?: string;
}

/** The themed error page, for unknown paths and failed renders. */
export function ErrorPage(props: ErrorPageProps) {
  const location = useLocation();

  // The response answers with the page's status during SSR (a no-op in the browser).
  httpStatus(props.status);
  const notFound = () => props.status === 404;

  // Mirrors what a shell says when you cd into a path that isn't there.
  const shellMessage = () =>
    notFound()
      ? `cd: ${location.pathname}: No such file or directory`
      : (props.message ?? "Something went wrong on this end.");

  return (
    <div class={layout.layout}>
      <SiteMeta
        path={location.pathname}
        title={notFound() ? "Page not found" : "Error"}
        robots="noindex"
      />
      <AppHeader />

      <main class={styles.main}>
        <div class={["container", styles.error]}>
          <h1 class="section-label">error</h1>

          <p class={styles.code}>{props.status}</p>

          <p class={styles.shell}>
            <span class={styles.prompt}>$</span> cd{" "}
            <span class={styles.path}>{location.pathname}</span>
          </p>

          <p class={styles.message}>{shellMessage()}</p>

          <div class={styles.actions}>
            <a href={paths()} class="button button--primary">
              cd ~
              <IconArrowRight size={16} />
            </a>

            <a href={paths.curriculum()} class="button button--outline">
              curriculum
            </a>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
