import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Globe, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovies, useTheaterShows, useEditorialReviews, useUserReviews, useShowtimes } from "@/hooks/useStrapi";
import EventCard from "@/components/EventCard";
import BookingModal from "@/components/BookingModal";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import type { StrapiMovie, StrapiTheaterShow } from "@/lib/api";

const EventDetail = ({ type }: { type: "movie" | "theater" }) => {
  const { slug } = useParams();
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data: movies, isLoading: moviesLoading } = useMovies();
  const { data: theaterShows, isLoading: theaterLoading } = useTheaterShows();
  const { data: editorialReviews } = useEditorialReviews();
  const { data: userReviews } = useUserReviews();
  const { data: showtimes } = useShowtimes();

  const isLoading = type === "movie" ? moviesLoading : theaterLoading;

  const event = type === "movie"
    ? movies?.find((m) => m.slug === slug)
    : theaterShows?.find((s) => s.slug === slug);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-36">
        <LoadingState />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-36 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl mb-2">Δεν βρέθηκε</h1>
          <Link to="/" className="text-primary text-sm">Αρχική</Link>
        </div>
      </div>
    );
  }

  const isMovie = type === "movie";
  const movie = isMovie ? event as StrapiMovie : null;
  const related = isMovie
    ? (movies ?? []).filter((m) => m.slug !== slug).slice(0, 4)
    : (theaterShows ?? []).filter((s) => s.slug !== slug).slice(0, 4);

  const eventEditorialReviews = (editorialReviews ?? []).filter((r) => r.contentTitle === event.title);
  const eventUserReviews = (userReviews ?? []).filter((r) => r.contentTitle === event.title);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <section className="relative min-h-[50vh] overflow-hidden bg-[#111111]">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: `linear-gradient(135deg, ${event.gradientFrom}, ${event.gradientTo})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />

        <div className="relative z-10 container h-full flex items-end pb-12 pt-36">
          <motion.div
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to={isMovie ? "/movies" : "/theater"} className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-3 h-3" /> Πίσω στις {isMovie ? "Ταινίες" : "Παραστάσεις"}
            </Link>

            {movie && (
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2 py-0.5 bg-white text-[11px] font-bold text-[#111111] rounded">{movie.criticScore}/10</span>
                <span className="text-xs text-white/50">{movie.ageRating}</span>
              </div>
            )}

            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4 text-white">{event.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-white/50 mb-6">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {event.duration} λεπτά</span>
              <span>{event.genre}</span>
              {movie && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {movie.language}</span>}
              {!isMovie && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {(event as StrapiTheaterShow).venue}</span>}
            </div>

            <button
              onClick={() => setBookingOpen(true)}
              className="inline-flex items-center px-6 py-3 bg-white text-[#111111] text-sm font-semibold rounded hover:bg-white/90 transition-colors"
            >
              Κράτηση Εισιτηρίου
            </button>
          </motion.div>
        </div>
      </section>

      <div className="container mt-10 space-y-12">
        <motion.section className="max-w-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h2 className="font-display text-xl font-semibold mb-3">Υπόθεση</h2>
          <p className="text-muted-foreground leading-relaxed">{event.synopsis}</p>
        </motion.section>

        <section className="card-elevated p-6 max-w-2xl">
          <h2 className="font-display text-lg font-semibold mb-4">Πληροφορίες</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground text-xs uppercase tracking-wider">Σκηνοθεσία</span><p className="font-medium mt-1">{event.director}</p></div>
            <div><span className="text-muted-foreground text-xs uppercase tracking-wider">Cast</span><p className="font-medium mt-1">{event.cast?.join(", ")}</p></div>
            <div><span className="text-muted-foreground text-xs uppercase tracking-wider">Είδος</span><p className="font-medium mt-1">{event.genre}</p></div>
            <div><span className="text-muted-foreground text-xs uppercase tracking-wider">Διάρκεια</span><p className="font-medium mt-1">{event.duration} λεπτά</p></div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Προβολές</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(showtimes ?? []).slice(0, 4).map((st) => (
              <button
                key={st.id}
                onClick={() => setBookingOpen(true)}
                className="rounded border border-border p-4 text-left transition-all hover:border-foreground hover:shadow-sm"
              >
                <p className="text-sm font-medium">
                  {new Date(st.datetime).toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(st.datetime).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })} · {st.venue}
                </p>
                <p className="text-sm font-bold mt-1">€{st.price}</p>
              </button>
            ))}
          </div>
        </section>

        {eventEditorialReviews.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold mb-4">Κριτικές Συντακτών</h2>
            {eventEditorialReviews.map((r) => (
              <div key={r.id} className="card-elevated p-6 border-l-4 border-l-[#111111] mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-foreground">{r.score}/10</span>
                </div>
                <h3 className="font-display font-semibold mb-2">{r.title}</h3>
                <p className="text-muted-foreground text-sm">{r.body}</p>
                <p className="text-xs text-muted-foreground mt-3">— {r.author}</p>
              </div>
            ))}
          </section>
        )}

        {eventUserReviews.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold mb-4">Κριτικές Χρηστών</h2>
            {eventUserReviews.map((r) => (
              <div key={r.id} className="card-elevated p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{r.userName}</span>
                  <span className="text-xs font-bold">{r.rating}/5 ★</span>
                </div>
                <p className="text-sm text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </section>
        )}

        <div className="card-elevated p-6 text-center max-w-md mx-auto border-2 border-[#111111]">
          <h3 className="font-display font-semibold mb-2">Γράψε Κριτική</h3>
          <p className="text-sm text-muted-foreground mb-3">Σύνδεση για να γράψεις κριτική</p>
          <Button variant="outline" size="sm" className="border-foreground text-foreground hover:bg-foreground hover:text-background">Σύνδεση</Button>
        </div>

        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Μπορεί να σου αρέσει</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((item, i) => (
              <EventCard
                key={item.id} slug={item.slug} title={item.title} subtitle={item.director}
                genre={item.genre} duration={item.duration}
                score={isMovie ? (item as StrapiMovie).criticScore : undefined}
                gradientFrom={item.gradientFrom} gradientTo={item.gradientTo}
                type={type} index={i}
              />
            ))}
          </div>
        </section>
      </div>

      <Footer />
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} eventTitle={event.title} />
    </div>
  );
};

export default EventDetail;
