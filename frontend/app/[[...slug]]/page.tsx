import type { Metadata } from "next";
import SpaRoot from "@/components/SpaRoot";
import ClientOnlySpaRoot from "@/components/ClientOnlySpaRoot";
import ServerJsonLd from "@/components/ServerJsonLd";
import HomeCrawlSnapshot from "@/components/HomeCrawlSnapshot";
import RqBootstrapScript from "@/components/RqBootstrapScript";
import { pathFromSlugParam } from "@/lib/jsonLdPage";
import { buildMetadataForPath } from "@/lib/pageMetadataServer";
import HomeStaticLcp from "@/components/HomeStaticLcp";
import { homeHeroPosterHref, homeLcpDisplay } from "@/lib/homeHeroLcp";
import { moviesFromDehydratedState, slimHomeBootstrapState } from "@/lib/rqBootstrap";
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
  const lcp = homeLcpDisplay(path, dehydratedState);
  const heroPoster = homeHeroPosterHref(path, dehydratedState);
  const preloadPoster = heroPoster ?? (!lcp?.hasHeroSection ? lcp?.posterHref : null);

  const showStaticLcp = path === "/" && lcp && !lcp.hasHeroSection;
  const crawlMovies = showStaticLcp ? moviesFromDehydratedState(dehydratedState) : [];

  return (
    <>
      {preloadPoster ? <link rel="preload" as="image" href={preloadPoster} fetchPriority="high" /> : null}
      {showStaticLcp ? <HomeStaticLcp posterHref={lcp.posterHref} title={lcp.title} /> : null}
      {showStaticLcp ? <HomeCrawlSnapshot movies={crawlMovies} /> : null}
      {showStaticLcp ? <RqBootstrapScript state={slimHomeBootstrapState(dehydratedState)} /> : null}
      <ServerJsonLd path={path} />
      {showStaticLcp ? (
        <ClientOnlySpaRoot ssrPath={path} />
      ) : (
        <SpaRoot ssrPath={path} dehydratedState={dehydratedState} suppressHydrationWarning={showStaticLcp} />
      )}
    </>
  );
}
