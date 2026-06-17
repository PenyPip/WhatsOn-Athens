import type { Metadata } from "next";
import SpaRoot from "../SpaShell";
import RqBootstrapScript from "@/components/RqBootstrapScript";
import ServerJsonLd from "@/components/ServerJsonLd";
import { pathFromSlugParam } from "@/lib/jsonLdPage";
import { buildMetadataForPath } from "@/lib/pageMetadataServer";
import HomeStaticLcp from "@/components/HomeStaticLcp";
import HomePageH1 from "@/components/HomePageH1";
import { homeLcpDisplay } from "@/lib/homeHeroLcp";
import { layoutShowsHero, resolveHomepageLayout, type MappedHomepage } from "@/config/home";
import { slimHomeBootstrapState } from "@/lib/rqBootstrap";
import { prefetchRouteData } from "@/lib/ssrPrefetch";
import spaPaths from "@/generated/spa-static-paths.json";

type SpaPathParams = { slug?: string[] };

type PageProps = {
  params: Promise<SpaPathParams>;
};

/** Αρχική `/` — απαιτείται ρητά με `output: export` και optional catch-all. */
const HOME_STATIC_PARAMS: SpaPathParams = { slug: [] };

/** Paths εκτός sitemap που χρειάζονται static HTML (noindex). */
const EXTRA_STATIC_PARAMS: SpaPathParams[] = [{ slug: ["profile"] }];

/**
 * Catch-all για React Router: κάθε path — SSR HTML στο build (prefetch Strapi) + JSON-LD / metadata.
 */
export function generateStaticParams(): SpaPathParams[] {
  const fromSitemap = spaPaths as SpaPathParams[];
  const hasHome = fromSitemap.some((p) => !p.slug?.length);
  const base = hasHome ? fromSitemap : [HOME_STATIC_PARAMS, ...fromSitemap];
  const extras = EXTRA_STATIC_PARAMS.filter(
    (extra) => !base.some((p) => JSON.stringify(p.slug ?? []) === JSON.stringify(extra.slug ?? [])),
  );
  return [...base, ...extras];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadataForPath(pathFromSlugParam(slug));
}

export default async function SpaCatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const path = pathFromSlugParam(slug);
  let dehydratedState = await prefetchRouteData(path);
  let homepageData: MappedHomepage | undefined;
  if (path === "/") {
    const homepageEntry = dehydratedState.queries.find((q) => q.queryKey[0] === "homepage");
    homepageData =
      homepageEntry?.state.status === "success"
        ? (homepageEntry.state.data as MappedHomepage | undefined)
        : undefined;
    const homeLayout = resolveHomepageLayout(homepageData ?? null);
    dehydratedState = slimHomeBootstrapState(dehydratedState);
    dehydratedState = {
      ...dehydratedState,
      queries: dehydratedState.queries.filter((q) => String(q.queryKey[0]) !== "siteNavigation"),
    };
  }
  const layout = resolveHomepageLayout(homepageData ?? null);
  const lcp = homeLcpDisplay(path, dehydratedState);
  const preloadPoster =
    path === "/" && layoutShowsHero(layout) ? lcp?.posterHref ?? null : null;
  /** Server HTML για LCP (αφίσα + τίτλος) — κρύβεται με `spa-lcp-done` μετά hydrate. */
  const showStaticLcp = path === "/" && layoutShowsHero(layout) && Boolean(lcp?.posterHref);

  return (
    <>
      {path === "/" ? <HomePageH1 /> : null}
      {preloadPoster ? (
        <link rel="preload" as="image" href={preloadPoster} fetchPriority="high" />
      ) : null}
      {showStaticLcp && lcp ? (
        <HomeStaticLcp posterHref={lcp.posterHref} title={lcp.title} synopsis={lcp.synopsis} />
      ) : null}
      <ServerJsonLd path={path} />
      <RqBootstrapScript state={dehydratedState} />
      <SpaRoot
        ssrPath={path}
        bootstrapState={dehydratedState}
        homeMainOverlap={showStaticLcp}
        homeStaticLcp={showStaticLcp}
        suppressHydrationWarning={showStaticLcp}
      />
    </>
  );
}
