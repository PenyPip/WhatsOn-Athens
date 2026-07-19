import { Suspense, useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { prefetchArticleDetailChunk } from "@/lib/articlePrefetch";
import {
  ChunkLoadErrorBoundary,
  installStaleTabRecovery,
  lazyWithChunkReload,
} from "@/lib/lazyWithChunkReload";
import { cn } from "@/lib/utils";
import UrlBackedMemoryRouter from "@/components/UrlBackedMemoryRouter";
import ScrollToTop from "@/components/ScrollToTop";
import Navbar from "@/components/Navbar";
import DeferredCookieConsent from "@/components/DeferredCookieConsent";
import RouteFallback from "@/components/RouteFallback";
import Index from "./views/Index";

const GoogleAnalytics = lazyWithChunkReload(() => import("@/components/GoogleAnalytics"));
const Movies = lazyWithChunkReload(() => import(/* webpackChunkName: "movies" */ "./views/Movies"));
const TheaterPage = lazyWithChunkReload(() => import(/* webpackChunkName: "theater" */ "./views/Theater"));
const TheaterVenueProgram = lazyWithChunkReload(() =>
  import(/* webpackChunkName: "theater-venue" */ "./views/TheaterVenueProgram"),
);
const EventDetail = lazyWithChunkReload(() => import(/* webpackChunkName: "event-detail" */ "./views/EventDetail"));
const Venues = lazyWithChunkReload(() => import(/* webpackChunkName: "venues" */ "./views/Venues"));
const Dining = lazyWithChunkReload(() => import(/* webpackChunkName: "dining" */ "./views/Dining"));
const DiningDetail = lazyWithChunkReload(() => import(/* webpackChunkName: "dining-detail" */ "./views/DiningDetail"));
const Reviews = lazyWithChunkReload(() => import(/* webpackChunkName: "reviews" */ "./views/Reviews"));
const ReviewDetail = lazyWithChunkReload(() => import(/* webpackChunkName: "review-detail" */ "./views/ReviewDetail"));
const Articles = lazyWithChunkReload(() => import(/* webpackChunkName: "articles" */ "./views/Articles"));
const ArticleDetail = lazyWithChunkReload(() => import(/* webpackChunkName: "article-detail" */ "./views/ArticleDetail"));
const Events = lazyWithChunkReload(() => import(/* webpackChunkName: "events" */ "./views/Events"));
const CulturalEventDetail = lazyWithChunkReload(() =>
  import(/* webpackChunkName: "cultural-event-detail" */ "./views/CulturalEventDetail"),
);
const Privacy = lazyWithChunkReload(() => import(/* webpackChunkName: "privacy" */ "./views/Privacy"));
const Profile = lazyWithChunkReload(() => import(/* webpackChunkName: "profile" */ "./views/Profile"));
const NotFound = lazyWithChunkReload(() => import(/* webpackChunkName: "not-found" */ "./views/NotFound"));

/** Suspense μόνο για lazy routes — η αρχική δεν αντικαθίσταται από placeholder (CLS). */
function LazyPage({ children }: { children: ReactNode }) {
  return (
    <ChunkLoadErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ChunkLoadErrorBoundary>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/movies" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/today" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/week" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/summer" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/new" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/soon" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/genre/:genreSlug" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/area/:areaKey" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/venue/:venueSlug" element={<LazyPage><Movies /></LazyPage>} />
      <Route path="/movies/:slug" element={<LazyPage><EventDetail type="movie" /></LazyPage>} />
      <Route path="/theater" element={<LazyPage><TheaterPage /></LazyPage>} />
      <Route path="/theater/venue/:venueSlug" element={<LazyPage><TheaterVenueProgram /></LazyPage>} />
      <Route path="/theater/:slug" element={<LazyPage><EventDetail type="theater" /></LazyPage>} />
      <Route path="/venues" element={<LazyPage><Venues /></LazyPage>} />
      <Route path="/dining" element={<LazyPage><Dining /></LazyPage>} />
      <Route path="/dining/:slug" element={<LazyPage><DiningDetail /></LazyPage>} />
      <Route path="/reviews" element={<LazyPage><Reviews /></LazyPage>} />
      <Route path="/reviews/:slug" element={<LazyPage><ReviewDetail /></LazyPage>} />
      <Route path="/articles" element={<LazyPage><Articles /></LazyPage>} />
      <Route path="/articles/:slug" element={<LazyPage><ArticleDetail /></LazyPage>} />
      <Route path="/events" element={<LazyPage><Events /></LazyPage>} />
      <Route path="/events/:slug" element={<LazyPage><CulturalEventDetail /></LazyPage>} />
      <Route path="/profile" element={<LazyPage><Profile /></LazyPage>} />
      <Route path="/privacy" element={<LazyPage><Privacy /></LazyPage>} />
      <Route path="*" element={<LazyPage><NotFound /></LazyPage>} />
    </Routes>
  );
}

type AppShellProps = {
  homeMainOverlap?: boolean;
  homeStaticLcp?: boolean;
};

function AppShell({ homeMainOverlap, homeStaticLcp }: AppShellProps) {
  const { pathname } = useLocation();
  const overlapHome = homeMainOverlap ?? pathname === "/";

  useEffect(() => {
    if (/^\/articles\/[^/]+$/.test(pathname)) {
      void prefetchArticleDetailChunk();
    }
  }, [pathname]);

  useEffect(() => installStaleTabRecovery(), []);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>
      <Navbar />
      <main
        className={cn(
          "min-h-screen max-md:pb-[calc(var(--mobile-tab-bar-h)+var(--mobile-safe-bottom-fixed))]",
          overlapHome ? "home-main-overlap" : "max-md:pt-16 md:pt-28",
        )}
      >
        {homeStaticLcp && overlapHome ? <div id="home-hero-ssr-spacer" aria-hidden /> : null}
        <DeferredCookieConsent />
        <AppRoutes />
      </main>
    </>
  );
}

type AppProps = {
  ssrPath?: string;
  homeMainOverlap?: boolean;
  homeStaticLcp?: boolean;
};

const App = ({ ssrPath = "/", homeMainOverlap, homeStaticLcp }: AppProps) => (
  <UrlBackedMemoryRouter ssrPath={ssrPath}>
    <AppShell homeMainOverlap={homeMainOverlap} homeStaticLcp={homeStaticLcp} />
  </UrlBackedMemoryRouter>
);

export default App;
