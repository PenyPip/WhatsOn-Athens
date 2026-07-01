import { lazy, Suspense } from "react";
import HomePageBodyShell from "@/components/HomePageBodyShell";
import HomeStaticLcpHandoff from "@/components/HomeStaticLcpHandoff";
import HomeSeoIntro from "@/components/HomeSeoIntro";
import MarkLcpDone from "@/components/MarkLcpDone";
import { layoutShowsHero } from "@/config/home";
import { SITE_INSTAGRAM_URL } from "@/config/siteLinks";
import { useClientMounted } from "@/hooks/useClientMounted";
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
}: {
  ready: boolean;
  layout: ResolvedHomepageLayout;
}) {
  if (!ready) {
    return <HomePageBodyShell layout={layout} />;
  }
  return (
    <Suspense fallback={<HomePageBodyShell layout={layout} />}>
      <HomeBody layout={layout} />
    </Suspense>
  );
}

const Index = () => {
  usePageSeo(staticPageSeo.home);

  const layout = useHomeLayout();
  const hasHero = layoutShowsHero(layout);
  const homeBodyReady = layout.sections.length > 0;
  const clientMounted = useClientMounted();
  const isMobile = useIsMobile();
  const deferLcp = useDeferUntilLcpDone();
  /**
   * Χωρίς SSR HomeBody — αποφεύγει React streaming swap (CLS ~1).
   * Mobile: μετά static LCP handoff. Desktop: αμέσως μετά hydrate.
   */
  const mountHomeBody =
    homeBodyReady && clientMounted && (!isMobile || deferLcp);

  return (
    <div className="min-h-screen md:pb-0">
      {!hasHero ? <MarkLcpDone /> : <HomeStaticLcpHandoff />}

      {homeBodyReady ? (
        <HomeBodyMountGate ready={mountHomeBody} layout={layout} />
      ) : null}
      <div>
        <HomeSeoIntro />

        <footer className="section-black border-t border-white/10 py-12">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-brand text-[1.6rem] font-light leading-none tracking-[-2px] text-[#F0EDF8]">
                      37
                    </span>
                    <sup className="font-display text-[0.8rem] font-normal not-italic text-[#F0EDF8]/60 align-super">°N</sup>
                  </div>
                  <div className="flex flex-col gap-0.5 border-l border-[#F0EDF8]/15 pl-2.5">
                    <span className="font-brand text-[0.45rem] font-bold tracking-[2px] text-[#F0EDF8]">ATHENS GUIDE</span>
                    <span className="font-body text-[0.42rem] font-light uppercase tracking-[1.5px] text-[#F0EDF8]/45">
                      Cinema · Events · Culture
                    </span>
                  </div>
                </div>
                <p className="text-white/65 text-xs mt-2 leading-relaxed">Ο οδηγός σου για ψυχαγωγία και γαστρονομία στην Αθήνα.</p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-[0.15em] text-white/70 mb-3">Εξερεύνηση</h4>
                <div className="space-y-2 text-sm">
                  <a href="/movies" className="block text-white/75 hover:text-white transition-colors">
                    Ταινίες
                  </a>
                  <a href="/theater" className="block text-white/75 hover:text-white transition-colors">
                    Θέατρο
                  </a>
                  <a href="/dining" className="block text-white/75 hover:text-white transition-colors">
                    Φαγητό
                  </a>
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-[0.15em] text-white/70 mb-3">Περιεχόμενο</h4>
                <div className="space-y-2 text-sm">
                  <a href="/venues" className="block text-white/75 hover:text-white transition-colors">
                    Χώροι
                  </a>
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-[0.15em] text-white/70 mb-3">Social</h4>
                <div className="space-y-2 text-sm">
                  <a
                    href={SITE_INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-white/75 hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-6 text-center">
              <p className="text-xs text-white/55">© 2025 37°N Athens. Με ❤️ από την Αθήνα.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
