import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Movies from "./pages/Movies";
import TheaterPage from "./pages/Theater";
import EventDetail from "./pages/EventDetail";
import Venues from "./pages/Venues";
import Dining from "./pages/Dining";
import DiningDetail from "./pages/DiningDetail";
import Reviews from "./pages/Reviews";
import ReviewDetail from "./pages/ReviewDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
