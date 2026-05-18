import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Index from "./views/Index";
import Movies from "./views/Movies";
import TheaterPage from "./views/Theater";
import EventDetail from "./views/EventDetail";
import Venues from "./views/Venues";
import Dining from "./views/Dining";
import DiningDetail from "./views/DiningDetail";
import Reviews from "./views/Reviews";
import ReviewDetail from "./views/ReviewDetail";
import Profile from "./views/Profile";
import NotFound from "./views/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        {/* Χώρος για fixed desktop nav (h-28)· το Hero το αναιρεί με -mt + pt. */}
        <main className="min-h-screen md:pt-28">
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
