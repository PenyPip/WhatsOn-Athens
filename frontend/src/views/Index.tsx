import { Suspense, useEffect } from "react";
import Footer from "@/components/Footer";
import HomePageBodyShell from "@/components/HomePageBodyShell";
import HomeStaticLcpHandoff from "@/components/HomeStaticLcpHandoff";
import HomeSeoIntro from "@/components/HomeSeoIntro";
import MarkLcpDone from "@/components/MarkLcpDone";
import { layoutShowsHero } from "@/config/home";
import { useHomeStaticLcpOnPage } from "@/contexts/HomeStaticLcpContext";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHomeLayout } from "@/hooks/useStrapi";
import { ChunkLoadErrorBoundary, lazyWithChunkReload, tryReloadForStaleChunk } from "@/lib/lazyWithChunkReload";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import type { ResolvedHomepageLayout } from "@/config/home";

const HomeBody = lazyWithChunkReload(() => import(/* webpackChunkName: "home-body" */ "@/views/HomeBody"));

function HomeBodyMountGate({
  ready,
  layout,
  staticLcpOnPage,
}: {
  ready: boolean;
  layout: ResolvedHomepageLayout;
  staticLcpOnPage: boolean;
}) {
  const shell = <HomePageBodyShell layout={layout} staticLcpOnPage={staticLcpOnPage} />;
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
  const staticLcpOnPage = useHomeStaticLcpOnPage();
  const hasHero = layoutShowsHero(layout);
  const homeBodyReady = layout.sections.length > 0;
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;
    void import(/* webpackChunkName: "home-body" */ "@/views/HomeBody").catch((error) => {
      tryReloadForStaleChunk(error);
    });
  }, [isMobile]);

  const mountHomeBody = homeBodyReady;

  return (
    <div className="min-h-screen md:pb-0">
      {!hasHero ? <MarkLcpDone /> : <HomeStaticLcpHandoff />}

      {homeBodyReady ? (
        <HomeBodyMountGate ready={mountHomeBody} layout={layout} staticLcpOnPage={staticLcpOnPage} />
      ) : null}
      <div>
        <HomeSeoIntro />
        <Footer className="mt-0" />
      </div>
    </div>
  );
};

export default Index;
