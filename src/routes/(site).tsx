import type { ParentProps } from "solid-js";
import { SiteLayout } from "../components/SiteLayout";
import { SiteMeta } from "../seo";
import { useLocation } from "@solidjs/router";

/**
 * Titles of the public pages. Their pages are server components, whose head
 * tags don't reach the document head, so the layout renders them.
 */
const PAGE_TITLES: Partial<Record<string, { title: string; ogTitle: string }>> = {
  "/": {
    title: "Senior Software Engineer in Berlin",
    ogTitle: "Christoph Stach, Senior Software Engineer in Berlin",
  },
  "/curriculum": { title: "Curriculum", ogTitle: "Curriculum · Christoph Stach" },
};

/** Public pages: the site chrome and head around each page. */
export default function Site(props: ParentProps) {
  const location = useLocation();
  const page = () => PAGE_TITLES[location.pathname];

  return (
    <SiteLayout>
      <SiteMeta path={location.pathname} title={page()?.title} ogTitle={page()?.ogTitle} />
      {props.children}
    </SiteLayout>
  );
}
