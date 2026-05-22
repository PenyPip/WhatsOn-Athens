import type { Metadata } from "next";
import SpaRoot from "@/components/SpaRoot";
import ServerJsonLd from "@/components/ServerJsonLd";
import StaticCrawlShell from "@/components/StaticCrawlShell";
import { pathFromSlugParam } from "@/lib/jsonLdPage";
import { buildMetadataForPath } from "@/lib/pageMetadataServer";
import spaPaths from "@/generated/spa-static-paths.json";

type SpaPathParams = { slug?: string[] };

type PageProps = {
  params: Promise<SpaPathParams>;
};

/** Αρχική `/` — απαιτείται ρητά με `output: export` και optional catch-all. */
const HOME_STATIC_PARAMS: SpaPathParams = { slug: [] };

/**
 * Catch-all για React Router: κάθε path σερβίρει SPA shell + server SEO (JSON-LD, canonical, crawl links).
 */
export function generateStaticParams(): SpaPathParams[] {
  const fromSitemap = spaPaths as SpaPathParams[];
  const hasHome = fromSitemap.some((p) => !p.slug?.length);
  return hasHome ? fromSitemap : [HOME_STATIC_PARAMS, ...fromSitemap];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadataForPath(pathFromSlugParam(slug));
}

export default async function SpaCatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const path = pathFromSlugParam(slug);

  return (
    <>
      <ServerJsonLd path={path} />
      <StaticCrawlShell path={path} />
      <SpaRoot />
    </>
  );
}
