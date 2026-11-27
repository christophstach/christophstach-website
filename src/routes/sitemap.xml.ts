import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { SITE_URL } from "../lib/site";
import { loadPublicSitemapUpdatedAtEffect } from "../server/cv-content";
import { runApiEffect } from "../server/effect";

interface SitemapEntry {
  readonly path: string;
  readonly priority: string;
}

const PUBLIC_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { path: "/", priority: "1.0" },
  { path: "/curriculum", priority: "0.8" },
];

function formatSitemapXml(updatedAt: string | null): string {
  const lastmod = updatedAt === null ? undefined : updatedAt.slice(0, 10);
  const urls = PUBLIC_SITEMAP_ENTRIES.map((entry) => {
    const loc = `${SITE_URL}${entry.path}`;
    const lastmodTag = lastmod === undefined ? "" : `\n    <lastmod>${lastmod}</lastmod>`;

    return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n    <priority>${entry.priority}</priority>\n  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Dynamic XML sitemap for the public indexable pages, cached with ISR and
// renewed whenever CV content changes in the desk. Falls back safely without
// `<lastmod>` if the database is unreachable.
export const GET: APIHandler = () =>
  runApiEffect(
    loadPublicSitemapUpdatedAtEffect().pipe(
      Effect.orElseSucceed((): string | null => null),
      Effect.map(
        (updatedAt) =>
          new Response(formatSitemapXml(updatedAt), {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
            },
          }),
      ),
    ),
  );
