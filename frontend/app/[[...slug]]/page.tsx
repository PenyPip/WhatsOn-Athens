import type { Metadata } from "next";
import SpaRoot from "../SpaShell";
import RqBootstrapScript from "@/components/RqBootstrapScript";
import ServerJsonLd from "@/components/ServerJsonLd";
import { pathFromSlugParam } from "@/lib/jsonLdPage";
import { buildMetadataForPath } from "@/lib/pageMetadataServer";
import HomeEarlyPaint from "@/components/HomeEarlyPaint";
import HomeStaticLcp from "@/components/HomeStaticLcp";
import { homeLcpDisplay } from "@/lib/homeHeroLcp";
import { homeNeedsTheater, resolveHomepageLayout, type MappedHomepage } from "@/config/home";
import { slimHomeBootstrapState } from "@/lib/rqBootstrap";
import { prefetchRouteData } from "@/lib/ssrPrefetch";
import { serializeDehydratedState } from "@/lib/serializeDehydratedState";
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
  let dehydratedState = await prefetchRouteData(path);
  if (path === "/") {
    const homepageEntry = dehydratedState.queries.find((q) => q.queryKey[0] === "homepage");
    const homepageData =
      homepageEntry?.state.status === "success"
        ? (homepageEntry.state.data as MappedHomepage | undefined)
        : undefined;
    const layout = resolveHomepageLayout(homepageData ?? null);
    const extraBootstrapKeys = homeNeedsTheater(layout.sections) ? (["theaterShows"] as const) : [];
    dehydratedState = slimHomeBootstrapState(dehydratedState, extraBootstrapKeys);
  }
  const lcp = homeLcpDisplay(path, dehydratedState);
  const preloadPoster = path === "/" ? lcp?.posterHref ?? null : null;
  /** Πάντα όταν υπάρχει αφίσα — γρήγορο LCP πριν το client Hero (Slow 4G). */
  const showStaticLcp = path === "/" && Boolean(lcp?.posterHref);

  return (
    <>
      {preloadPoster ? (
        <link rel="preload" as="image" href={preloadPoster} fetchPriority="high" />
      ) : null}
      {showStaticLcp && lcp ? <HomeStaticLcp posterHref={lcp.posterHref} title={lcp.title} /> : null}
      {path === "/" ? <HomeEarlyPaint /> : null}
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
