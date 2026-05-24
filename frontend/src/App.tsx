import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import UrlBackedMemoryRouter from "@/components/UrlBackedMemoryRouter";
import ScrollToTop from "@/components/ScrollToTop";
import Navbar from "@/components/Navbar";
import DeferredCookieConsent from "@/components/DeferredCookieConsent";
import RouteFallback from "@/components/RouteFallback";
const Index = lazy(() => import(/* webpackChunkName: "home" */ "./views/Index"));

const GoogleAnalytics = lazy(() => import("@/components/GoogleAnalytics"));
const Movies = lazy(() => import(/* webpackChunkName: "movies" */ "./views/Movies"));
const TheaterPage = lazy(() => import(/* webpackChunkName: "theater" */ "./views/Theater"));
const EventDetail = lazy(() => import(/* webpackChunkName: "event-detail" */ "./views/EventDetail"));
const Venues = lazy(() => import(/* webpackChunkName: "venues" */ "./views/Venues"));
const Dining = lazy(() => import(/* webpackChunkName: "dining" */ "./views/Dining"));
const DiningDetail = lazy(() => import(/* webpackChunkName: "dining-detail" */ "./views/DiningDetail"));
const Reviews = lazy(() => import(/* webpackChunkName: "reviews" */ "./views/Reviews"));
const ReviewDetail = lazy(() => import(/* webpackChunkName: "review-detail" */ "./views/ReviewDetail"));
const Privacy = lazy(() => import(/* webpackChunkName: "privacy" */ "./views/Privacy"));
const Profile = lazy(() => import(/* webpackChunkName: "profile" */ "./views/Profile"));
const NotFound = lazy(() => import(/* webpackChunkName: "not-found" */ "./views/NotFound"));

/** Suspense μόνο για lazy routes — η αρχική δεν αντικαθίσταται από placeholder (CLS). */
function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={null}>
            <Index />
          </Suspense>
        }
      />
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
      <Route path="/theater/:slug" element={<LazyPage><EventDetail type="theater" /></LazyPage>} />
      <Route path="/venues" element={<LazyPage><Venues /></LazyPage>} />
      <Route path="/dining" element={<LazyPage><Dining /></LazyPage>} />
      <Route path="/dining/:slug" element={<LazyPage><DiningDetail /></LazyPage>} />
      <Route path="/reviews" element={<LazyPage><Reviews /></LazyPage>} />
      <Route path="/reviews/:slug" element={<LazyPage><ReviewDetail /></LazyPage>} />
      <Route path="/profile" element={<LazyPage><Profile /></LazyPage>} />
      <Route path="/privacy" element={<LazyPage><Privacy /></LazyPage>} />
      <Route path="*" element={<LazyPage><NotFound /></LazyPage>} />
    </Routes>
  );
}

function AppShell() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>
      <Navbar />
      <main className="min-h-screen max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] max-md:pt-16 md:pt-28">
        <DeferredCookieConsent />
        <AppRoutes />
      </main>
    </>
  );
}

type AppProps = {
  ssrPath?: string;
};

const App = ({ ssrPath = "/" }: AppProps) => (
  <UrlBackedMemoryRouter ssrPath={ssrPath}>
    <AppShell />
  </UrlBackedMemoryRouter>
);

export default App;
