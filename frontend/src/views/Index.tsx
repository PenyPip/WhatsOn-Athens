import { lazy, Suspense, useEffect } from "react";
import Footer from "@/components/Footer";
import HomePageBodyShell from "@/components/HomePageBodyShell";
import HomeStaticLcpHandoff from "@/components/HomeStaticLcpHandoff";
import HomeSeoIntro from "@/components/HomeSeoIntro";
import MarkLcpDone from "@/components/MarkLcpDone";
import { layoutShowsHero } from "@/config/home";
import { useHomeStaticLcpOnPage } from "@/contexts/HomeStaticLcpContext";
import { useDeferUntilLcpDone } from "@/hooks/useDeferUntilLcpDone";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHomeLayout } from "@/hooks/useStrapi";
import { staticPageSeo } from "@/lib/pageSeoCopy";
import type { ResolvedHomepageLayout } from "@/config/home";

const HomeBody = lazy(() => import(/* webpackChunkName: "home-body" */ "@/views/HomeBody"));

function HomeBodyMountGate({
  ready,
  layout,
  lightFallback,
}: {
  ready: boolean;
  layout: ResolvedHomepageLayout;
  lightFallback: boolean;
}) {
  const fallback = lightFallback ? (
    <div className="min-h-[8rem]" aria-hidden />
  ) : (
    <HomePageBodyShell layout={layout} />
  );
  if (!ready) {
    return <HomePageBodyShell layout={layout} staticLcpOnPage={lightFallback} />;
  }
  return (
    <Suspense fallback={fallback}>
      <HomeBody layout={layout} />
    </Suspense>
  );
}

const Index = () => {
  usePageSeo(staticPageSeo.home);

  const layout = useHomeLayout();
  const staticLcpOnPage = useHomeStaticLcpOnPage();
  const hasHero = layoutShowsHero(layout);
  const homeBodyReady = layout.sections.length > 0;
  const isMobile = useIsMobile();
  const deferLcp = useDeferUntilLcpDone();

  useEffect(() => {
    if (isMobile) void import(/* webpackChunkName: "home-body" */ "@/views/HomeBody");
  }, [isMobile]);

  /** Mobile: μετά overlay handoff. Desktop: αμέσως — το live hero κρατά το slot μέχρι poster. */
  const mountHomeBody = homeBodyReady && (!isMobile || deferLcp);

  return (
    <div className="min-h-screen md:pb-0">
      {!hasHero ? <MarkLcpDone /> : <HomeStaticLcpHandoff />}

      {homeBodyReady ? (
        <HomeBodyMountGate ready={mountHomeBody} layout={layout} lightFallback={staticLcpOnPage} />
      ) : null}
      <div>
        <HomeSeoIntro />
        <Footer className="mt-0" />
      </div>
    </div>
  );
};

export default Index;
