import { lazy, Suspense, useEffect, useState } from "react";
import LoadingState from "@/components/LoadingState";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Navbar from "@/components/Navbar";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./views/Index";
import Movies from "./views/Movies";
import TheaterPage from "./views/Theater";
import EventDetail from "./views/EventDetail";
import Venues from "./views/Venues";
import Dining from "./views/Dining";
import DiningDetail from "./views/DiningDetail";
import Reviews from "./views/Reviews";
import ReviewDetail from "./views/ReviewDetail";
import Privacy from "./views/Privacy";

/** Χαμηλής SEO σημασίας — παραμένουν lazy. */
const Profile = lazy(() => import("./views/Profile"));
const NotFound = lazy(() => import("./views/NotFound"));

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/movies" element={<Movies />} />
      <Route path="/movies/:slug" element={<EventDetail type="movie" />} />
      <Route path="/theater" element={<TheaterPage />} />
      <Route path="/theater/:slug" element={<EventDetail type="theater" />} />
      <Route path="/venues" element={<Venues />} />
      <Route path="/dining" element={<Dining />} />
      <Route path="/dining/:slug" element={<DiningDetail />} />
      <Route path="/reviews" element={<Reviews />} />
      <Route path="/reviews/:slug" element={<ReviewDetail />} />
      <Route
        path="/profile"
        element={
          <Suspense fallback={<LoadingState message="Φόρτωση…" />}>
            <Profile />
          </Suspense>
        }
      />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="*"
        element={
          <Suspense fallback={<LoadingState message="Φόρτωση…" />}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}

function AppShell() {
  return (
    <>
      <ScrollToTop />
      <GoogleAnalytics />
      <Navbar />
      <main className="min-h-screen max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] max-md:pt-16 md:pt-28">
        <CookieConsentBanner />
        <AppRoutes />
      </main>
    </>
  );
}

type AppProps = {
  /** Pathname για MemoryRouter στο SSR / πρώτο client paint (χωρίς hydration mismatch). */
  ssrPath?: string;
};

const App = ({ ssrPath = "/" }: AppProps) => {
  const [clientNav, setClientNav] = useState(false);

  useEffect(() => {
    setClientNav(true);
  }, []);

  if (!clientNav) {
    return (
      <MemoryRouter initialEntries={[ssrPath]} initialIndex={0}>
        <AppShell />
      </MemoryRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
};

export default App;
