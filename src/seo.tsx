import { Link, Meta, Script, Title } from "@solidjs/meta";
import { SITE_OWNER, SITE_URL, normalizePathname } from "./lib/site";
import { Show } from "solid-js";

const OG_IMAGE = `${SITE_URL}/images/og.png`;

const DEFAULT_DESCRIPTION =
  "Christoph Stach is a senior software engineer based in Berlin with a strong background in web development, who owns the Python platform behind LLM agents at MBition (Mercedes-Benz).";

const DEFAULT_PERSON = {
  jobTitle: "Senior Software Engineer",
  worksFor: "MBition GmbH (Mercedes-Benz)",
  knowsAbout: [
    "Vue",
    "Nuxt",
    "React",
    "Next.js",
    "Remix",
    "TypeScript",
    "Tailwind CSS",
    "Python",
    "NestJS",
    "Node.js",
    "LLM Agents",
    "Retrieval-Augmented Generation",
    "LangChain",
    "Model Context Protocol",
    "Agent-to-Agent Protocol",
    "PostgreSQL",
    "MongoDB",
    "Docker",
    "Kubernetes",
    "Continuous Integration",
  ] as readonly string[],
};

export interface SiteMetaPerson {
  jobTitle?: string | undefined;
  worksFor?: string | undefined;
  knowsAbout?: readonly string[] | undefined;
}

export interface SiteMetaProps {
  /** The page's path, e.g. "/curriculum", for the canonical URL. */
  path: string;
  /** The page title, shown as "<title> · Christoph Stach"; none shows the name alone. */
  title?: string | undefined;
  /** The meta/OpenGraph description; defaults to the site summary. */
  description?: string | undefined;
  /** The title for link previews; defaults to the site name. */
  ogTitle?: string | undefined;
  /** OpenGraph locale, e.g. "en_US" or "de_DE"; defaults to "en_US". */
  ogLocale?: string | undefined;
  /** When true, marks the page noindex and omits canonical, OG/Twitter tags, and JSON-LD. */
  noindex?: boolean | undefined;
  /** A robots directive, e.g. "noindex, nofollow". */
  robots?: string | undefined;
  /** Optional dynamic overrides for the home page's Person JSON-LD. */
  person?: SiteMetaPerson | undefined;
}

function buildPersonJsonLd(description: string, person?: SiteMetaPerson): string {
  const jobTitle = person?.jobTitle?.trim() || DEFAULT_PERSON.jobTitle;
  const worksFor = person?.worksFor?.trim() || DEFAULT_PERSON.worksFor;
  const knowsAbout =
    person?.knowsAbout !== undefined && person.knowsAbout.length > 0
      ? person.knowsAbout
      : DEFAULT_PERSON.knowsAbout;

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE_OWNER.name,
    url: SITE_URL,
    // Crawler-facing copy of the hero portrait, in a format every crawler reads.
    // Keep it in sync with public/images/hero.webp.
    image: `${SITE_URL}/images/hero.png`,
    jobTitle,
    description,
    worksFor: { "@type": "Organization", name: worksFor },
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE_OWNER.postalCodeCity,
      addressCountry: "DE",
    },
    alumniOf: { "@type": "CollegeOrUniversity", name: "HTW Berlin" },
    knowsAbout,
    sameAs: [SITE_OWNER.linkedinUrl, SITE_OWNER.githubUrl],
  }).replace(/</g, "\\u003c");
}

/**
 * The head of a public page: title, description, link previews, canonical URL,
 * JSON-LD. Takes the path rather than reading the router, so server pages can use it.
 */
export function SiteMeta(props: SiteMetaProps) {
  const normalizedPath = () => normalizePathname(props.path);
  const canonical = () => `${SITE_URL}${normalizedPath()}`;
  const description = () => props.description ?? DEFAULT_DESCRIPTION;
  const isNoindex = () =>
    props.noindex ?? (props.robots !== undefined && /\bnoindex\b/i.test(props.robots));
  const robotsContent = () =>
    props.robots ?? (props.noindex === true ? "noindex, nofollow" : undefined);
  const personJsonLd = () => buildPersonJsonLd(description(), props.person);

  return (
    <>
      <Title>
        {props.title === undefined ? SITE_OWNER.name : `${props.title} · ${SITE_OWNER.name}`}
      </Title>
      <Meta name="description" content={description()} />
      <Show when={robotsContent()}>{(content) => <Meta name="robots" content={content()} />}</Show>
      <Show when={!isNoindex()}>
        <Meta property="og:type" content="website" />
        <Meta property="og:site_name" content={SITE_OWNER.name} />
        <Meta property="og:title" content={props.ogTitle ?? SITE_OWNER.name} />
        <Meta property="og:description" content={description()} />
        <Meta property="og:url" content={canonical()} />
        <Meta property="og:locale" content={props.ogLocale ?? "en_US"} />
        <Meta property="og:image" content={OG_IMAGE} />
        <Meta property="og:image:width" content="1200" />
        <Meta property="og:image:height" content="630" />
        <Meta property="og:image:type" content="image/png" />
        <Meta
          property="og:image:alt"
          content="Christoph Stach — Senior Software Engineer based in Berlin"
        />
        <Meta name="twitter:card" content="summary_large_image" />
        <Meta name="twitter:image" content={OG_IMAGE} />
        <Link rel="canonical" href={canonical()} />
        <Show when={normalizedPath() === "/"}>
          <Script type="application/ld+json" innerHTML={personJsonLd()} />
        </Show>
      </Show>
    </>
  );
}
