import type { Metadata } from "next";
import dynamic from "next/dynamic";
import RqBootstrapScript from "@/components/RqBootstrapScript";
import ServerJsonLd from "@/components/ServerJsonLd";
import { pathFromSlugParam } from "@/lib/jsonLdPage";
import { buildMetadataForPath } from "@/lib/pageMetadataServer";
import HomeStaticLcp from "@/components/HomeStaticLcp";
import { homeHeroPosterHref, homeLcpDisplay } from "@/lib/homeHeroLcp";
import { slimHomeBootstrapState } from "@/lib/rqBootstrap";
import { prefetchRouteData } from "@/lib/ssrPrefetch";
import { serializeDehydratedState } from "@/lib/serializeDehydratedState";
import spaPaths from "@/generated/spa-static-paths.json";

const SpaRoot = dynamic(() => import("../SpaShell"), { ssr: true });

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
  let dehydratedState = await prefetchRouteData(path);
  if (path === "/") {
    dehydratedState = slimHomeBootstrapState(dehydratedState);
  }
  const lcp = homeLcpDisplay(path, dehydratedState);
  const heroPoster = homeHeroPosterHref(path, dehydratedState);
  const preloadPoster = heroPoster ?? (!lcp?.hasHeroSection ? lcp?.posterHref : null);

  const showStaticLcp = path === "/" && lcp && !lcp.hasHeroSection;

  return (
    <>
      {preloadPoster ? <link rel="preload" as="image" href={preloadPoster} fetchPriority="high" /> : null}
      {showStaticLcp ? <HomeStaticLcp posterHref={lcp.posterHref} title={lcp.title} /> : null}
      <ServerJsonLd path={path} />
      <RqBootstrapScript state={dehydratedState} />
      <SpaRoot
        ssrPath={path}
        bootstrapJson={serializeDehydratedState(dehydratedState)}
        suppressHydrationWarning={showStaticLcp}
      />
    </>
  );
}
