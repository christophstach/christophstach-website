import { IconArrowRight } from "./icons";
import { SiteLayout } from "./SiteLayout";
import { SiteMeta } from "../seo";
import { httpStatus } from "@solidjs/web";
import { paths } from "../router";
import styles from "./ErrorPage.module.css";
import { untrack } from "solid-js";
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
  httpStatus(untrack(() => props.status));
  const notFound = () => props.status === 404;

  const heading = () =>
    notFound() ? `${props.status} — Page not found` : `${props.status} — Something went wrong`;

  // Mirrors what a shell says when you cd into a path that isn't there.
  const shellMessage = () =>
    notFound()
      ? `cd: ${location.pathname}: No such file or directory`
      : (props.message ?? "Something went wrong on this end.");

  return (
    <SiteLayout>
      <SiteMeta
        path={location.pathname}
        title={notFound() ? "Page not found" : "Error"}
        robots="noindex"
      />

      <div class={["container", styles.error]}>
        <p class="section-label">error</p>

        <h1 class={styles.heading}>{heading()}</h1>

        <p class={styles.shell}>
          <span class={styles.prompt} aria-hidden="true">
            $
          </span>{" "}
          cd <span class={styles.path}>{location.pathname}</span>
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
    </SiteLayout>
  );
}
