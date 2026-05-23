import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Navbar from "@/components/Navbar";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import LoadingState from "@/components/LoadingState";
import Index from "./views/Index";

const Movies = lazy(() => import("./views/Movies"));
const TheaterPage = lazy(() => import("./views/Theater"));
const EventDetail = lazy(() => import("./views/EventDetail"));
const Venues = lazy(() => import("./views/Venues"));
const Dining = lazy(() => import("./views/Dining"));
const DiningDetail = lazy(() => import("./views/DiningDetail"));
const Reviews = lazy(() => import("./views/Reviews"));
const ReviewDetail = lazy(() => import("./views/ReviewDetail"));
const Profile = lazy(() => import("./views/Profile"));
const NotFound = lazy(() => import("./views/NotFound"));
const Privacy = lazy(() => import("./views/Privacy"));

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState message="Φόρτωση…" />}>
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
