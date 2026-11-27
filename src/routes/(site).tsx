import type { ParentProps } from "solid-js";
import { SiteLayout } from "../components/SiteLayout";
import { normalizePathname } from "../lib/site";
import { SiteMeta } from "../seo";
import { paths } from "../router";
import { useLocation } from "@solidjs/router";

interface PageMetaConfig {
  title: string;
  description?: string;
  ogTitle?: string;
  ogLocale?: string;
  noindex?: boolean;
}

/**
 * Head metadata of the public pages. Server pages can't render head tags into
 * the document head, so the layout renders them by normalized pathname.
 */
const PAGE_META: Partial<Record<string, PageMetaConfig>> = {
  [paths()]: {
    title: "Senior Software Engineer in Berlin",
    ogTitle: "Christoph Stach, Senior Software Engineer in Berlin",
  },
  [paths.curriculum()]: {
    title: "Curriculum",
    ogTitle: "Curriculum · Christoph Stach",
    description:
      "Professional experience, education, and selected projects of Christoph Stach, Senior Software Engineer based in Berlin.",
  },
  [paths.impressum()]: {
    title: "Impressum",
    description:
      "Impressum und Angaben gemäß § 5 DDG sowie § 18 Abs. 2 MStV für christophstach.de.",
    ogLocale: "de_DE",
    noindex: true,
  },
  [paths.datenschutz()]: {
    title: "Datenschutz",
    ogTitle: "Datenschutz · Christoph Stach",
    description: "Datenschutzerklärung gemäß Art. 13 DSGVO und § 25 TDDDG für christophstach.de.",
    ogLocale: "de_DE",
  },
  [paths.login()]: {
    title: "Sign in",
    noindex: true,
  },
};

/** Public pages: the site chrome and head around each page. */
export default function Site(props: ParentProps) {
  const location = useLocation();
  const pathname = () => normalizePathname(location.pathname);
  const page = () => PAGE_META[pathname()];

  return (
    <SiteLayout>
      <SiteMeta
        path={pathname()}
        title={page()?.title}
        description={page()?.description}
        ogTitle={page()?.ogTitle}
        ogLocale={page()?.ogLocale}
        noindex={page()?.noindex}
      />
      {props.children}
    </SiteLayout>
  );
}
