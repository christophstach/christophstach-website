import { Link, Meta, Script, Title } from "@solidjs/meta";

const SITE_URL = "https://christophstach.de";
const SITE_NAME = "Christoph Stach";
const OG_IMAGE = `${SITE_URL}/images/og.png`;

const DESCRIPTION =
  "Christoph Stach is a senior software engineer based in Berlin with a strong background in web development, who owns the Python platform behind LLM agents at MBition (Mercedes-Benz).";

const PERSON_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_NAME,
  url: SITE_URL,
  // Crawler-facing copy of the hero portrait, in a format every crawler reads.
  // Keep it in sync with public/images/hero.webp.
  image: `${SITE_URL}/images/hero.png`,
  jobTitle: "Senior Software Engineer",
  description: DESCRIPTION,
  worksFor: { "@type": "Organization", name: "MBition GmbH (Mercedes-Benz)" },
  address: { "@type": "PostalAddress", addressLocality: "Berlin", addressCountry: "DE" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "HTW Berlin" },
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
  ],
  sameAs: [
    "https://www.linkedin.com/in/christoph-stach-7586b958",
    "https://github.com/christophstach",
  ],
});

interface SiteMetaProps {
  /** The page's path, e.g. "/curriculum", for the canonical URL. */
  path: string;
  /** The page title, shown as "<title> · Christoph Stach"; none shows the name alone. */
  title?: string | undefined;
  /** The title for link previews; defaults to the site name. */
  ogTitle?: string | undefined;
  /** A robots directive, e.g. "noindex, nofollow". */
  robots?: string | undefined;
}

/**
 * The head of a public page: title, description, link previews, canonical URL,
 * JSON-LD. Takes the path rather than reading the router, so server pages can use it.
 */
export function SiteMeta(props: SiteMetaProps) {
  const canonical = () => `${SITE_URL}${props.path}`;

  return (
    <>
      <Title>{props.title === undefined ? SITE_NAME : `${props.title} · ${SITE_NAME}`}</Title>
      <Meta name="description" content={DESCRIPTION} />
      <Meta property="og:type" content="website" />
      <Meta property="og:site_name" content={SITE_NAME} />
      <Meta property="og:title" content={props.ogTitle ?? SITE_NAME} />
      <Meta property="og:description" content={DESCRIPTION} />
      <Meta property="og:url" content={canonical()} />
      <Meta property="og:locale" content="en_US" />
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
      {props.robots !== undefined && <Meta name="robots" content={props.robots} />}
      <Link rel="canonical" href={canonical()} />
      <Script type="application/ld+json" innerHTML={PERSON_JSON_LD} />
    </>
  );
}
