import { Suspense, useEffect, useLayoutEffect } from "react";
import Footer from "@/components/Footer";
import HomePageBodyShell from "@/components/HomePageBodyShell";
import HomeStaticLcpHandoff from "@/components/HomeStaticLcpHandoff";
import HomeSeoIntro from "@/components/HomeSeoIntro";
import MarkLcpDone from "@/components/MarkLcpDone";
import { HomeHeroLayoutReserve } from "@/components/HomeHeroLayoutReserve";
import { layoutShowsHero } from "@/config/home";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHomeLayout } from "@/hooks/useStrapi";
import { ChunkLoadErrorBoundary, lazyWithChunkReload, tryReloadForStaleChunk } from "@/lib/lazyWithChunkReload";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import { lockHomeHeroSpacerDom } from "@/hooks/useHomeLcpDone";
import type { ResolvedHomepageLayout } from "@/config/home";

const HomeBody = lazyWithChunkReload(() => import(/* webpackChunkName: "home-body" */ "@/views/HomeBody"));

function HomeBodyMountGate({
  ready,
  layout,
}: {
  ready: boolean;
  layout: ResolvedHomepageLayout;
}) {
  const shell = <HomePageBodyShell layout={layout} />;
  if (!ready) {
    return shell;
  }
  return (
    <ChunkLoadErrorBoundary>
      <Suspense fallback={shell}>
        <HomeBody layout={layout} />
      </Suspense>
    </ChunkLoadErrorBoundary>
  );
}

const Index = () => {
  usePageSeo(staticPageSeo.home);

  const layout = useHomeLayout();
  const hasHero = layoutShowsHero(layout);
  const homeBodyReady = layout.sections.length > 0;
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;
    void import(/* webpackChunkName: "home-body" */ "@/views/HomeBody").catch((error) => {
      tryReloadForStaleChunk(error);
    });
  }, [isMobile]);

  useLayoutEffect(() => {
    if (hasHero) lockHomeHeroSpacerDom();
  }, [hasHero]);

  const mountHomeBody = homeBodyReady;

  return (
    <div className="min-h-screen md:pb-0">
      {!hasHero ? <MarkLcpDone /> : <HomeStaticLcpHandoff />}

      {hasHero ? <HomeHeroLayoutReserve /> : null}

      {homeBodyReady ? (
        <HomeBodyMountGate ready={mountHomeBody} layout={layout} />
      ) : null}
      <div>
        <HomeSeoIntro />
        <Footer className="mt-0" />
      </div>
    </div>
  );
};

export default Index;
