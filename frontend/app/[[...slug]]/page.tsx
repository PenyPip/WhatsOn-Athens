import type { Metadata } from "next";
import SpaRoot from "@/components/SpaRoot";
import ServerJsonLd from "@/components/ServerJsonLd";
import { pathFromSlugParam } from "@/lib/jsonLdPage";
import { buildMetadataForPath } from "@/lib/pageMetadataServer";
import { homeHeroPosterHref } from "@/lib/homeHeroLcp";
import { prefetchRouteData } from "@/lib/ssrPrefetch";
import spaPaths from "@/generated/spa-static-paths.json";

type SpaPathParams = { slug?: string[] };

type PageProps = {
  params: Promise<SpaPathParams>;
};

/** Αρχική `/` — απαιτείται ρητά με `output: export` και optional catch-all. */
const HOME_STATIC_PARAMS: SpaPathParams = { slug: [] };

/**
 * Catch-all για React Router: κάθε path — SSR HTML στο build (prefetch Strapi) + JSON-LD / metadata.
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
  const dehydratedState = await prefetchRouteData(path);
  const heroPoster = homeHeroPosterHref(path, dehydratedState);

  return (
    <>
      {heroPoster ? <link rel="preload" as="image" href={heroPoster} fetchPriority="high" /> : null}
      <ServerJsonLd path={path} />
      <SpaRoot ssrPath={path} dehydratedState={dehydratedState} />
    </>
  );
}
