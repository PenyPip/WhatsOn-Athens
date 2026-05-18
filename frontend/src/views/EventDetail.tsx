import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Globe, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovies, useTheaterShows, useEditorialReviews, useUserReviews, useShowtimes } from "@/hooks/useStrapi";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import type { StrapiMovie, StrapiShowtime, StrapiTheaterShow } from "@/lib/api";

const EventDetail = ({ type }: { type: "movie" | "theater" }) => {
  const { slug } = useParams();

  const { data: movies, isLoading: moviesLoading } = useMovies();
  const { data: theaterShows, isLoading: theaterLoading } = useTheaterShows();
  const { data: editorialReviews } = useEditorialReviews();
  const { data: userReviews } = useUserReviews();
  const { data: showtimes } = useShowtimes();

  const eventShowtimes = useMemo((): StrapiShowtime[] => {
    const list = showtimes ?? [];
    if (!slug || type !== "movie") return [];
    const filtered = list.filter((st) => st.movieSlug === slug);
    return [...filtered].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [showtimes, slug, type]);

  const showtimesByVenue = useMemo(() => {
    const m = new Map<string, StrapiShowtime[]>();
    for (const st of eventShowtimes) {
      const key = typeof st.venue === "string" && st.venue.trim() ? st.venue.trim() : "Χώρος χωρίς όνομα";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(st);
    }
    const keys = [...m.keys()].sort((a, b) => a.localeCompare(b, "el"));
    return keys.map((venueName) => ({
      venueName,
      slots: [...(m.get(venueName) ?? [])].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()),
    }));
  }, [eventShowtimes]);

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
          <Link to="/" className="text-primary text-base">Αρχική</Link>
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
      <section className="relative min-h-[50vh] overflow-hidden bg-[#13143E]">
        {!isMovie ? (
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `linear-gradient(135deg, ${(event as StrapiTheaterShow).gradientFrom}, ${(event as StrapiTheaterShow).gradientTo})`,
            }}
          />
        ) : movie?.posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- αφίσες Strapi, static export */}
            <img
              src={movie.posterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#13143E]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13143E] via-transparent to-transparent" />

        <div className="relative z-10 container h-full flex items-end pb-12 pt-36">
          <motion.div
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to={isMovie ? "/movies" : "/theater"} className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> Πίσω στις {isMovie ? "Ταινίες" : "Παραστάσεις"}
            </Link>

            {movie && (
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2 py-0.5 bg-white text-sm font-bold text-[#13143E] rounded">{movie.criticScore}/10</span>
                <span className="text-sm text-white/60">{movie.ageRating}</span>
              </div>
            )}

            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4 text-white">{event.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-base text-white/60 mb-6">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {event.duration} λεπτά</span>
              {movie ? (
                <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white">
                  Είδος · {movie.genre}
                </span>
              ) : (
                <span>{event.genre}</span>
              )}
              {movie && <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> {movie.language}</span>}
              {!isMovie && <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {(event as StrapiTheaterShow).venue}</span>}
            </div>

            <a
              href="#showtimes"
              className="inline-flex items-center px-6 py-3 bg-white text-[#13143E] text-base font-semibold rounded hover:bg-white/90 transition-colors"
            >
              Προβολές & τιμές
            </a>
          </motion.div>
        </div>
      </section>

      <div className="container mt-10 space-y-12">
        <motion.section className="max-w-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h2 className="font-display text-xl font-semibold mb-3">Υπόθεση</h2>
          <p className="text-muted-foreground text-base leading-relaxed">{event.synopsis}</p>
        </motion.section>

        <section className="card-elevated p-6 max-w-2xl">
          <h2 className="font-display text-lg font-semibold mb-4">Πληροφορίες</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-muted-foreground text-sm uppercase tracking-wider">Σκηνοθεσία</span><p className="font-medium text-base mt-1">{event.director}</p></div>
            <div><span className="text-muted-foreground text-sm uppercase tracking-wider">Cast</span><p className="font-medium text-base mt-1">{event.cast?.join(", ")}</p></div>
            <div><span className="text-muted-foreground text-sm uppercase tracking-wider">Είδος</span><p className="font-medium text-base mt-1">{event.genre}</p></div>
            <div><span className="text-muted-foreground text-sm uppercase tracking-wider">Διάρκεια</span><p className="font-medium text-base mt-1">{event.duration} λεπτά</p></div>
          </div>
        </section>

        <section id="showtimes">
          <h2 className="font-display text-xl font-semibold mb-2">Πού παίζει & ώρες</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
            Κάθε γραμμή είναι προγραμματισμένη προβολή: ημερομηνία, ώρα και σινεμά όπως καταχωρείται στον οδηγό.
          </p>
          {eventShowtimes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Δεν έχουν καταχωρηθεί προβολές ακόμη.</p>
          ) : (
            <div className="space-y-10 max-w-3xl">
              {showtimesByVenue.map(({ venueName, slots }) => (
                <div key={venueName}>
                  <h3 className="font-display text-lg font-semibold mb-4 border-b border-border pb-2">{venueName}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {slots.map((st) => {
                      const d = new Date(st.datetime);
                      return (
                        <div key={st.id} className="rounded-lg border border-border bg-card/30 p-4 text-left">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ημερομηνία</p>
                          <p className="text-base font-semibold text-foreground">
                            {d.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
                          </p>
                          <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ώρα έναρξης</p>
                          <p className="text-lg font-bold text-foreground tabular-nums">
                            {d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {st.hallName ? (
                            <p className="mt-2 text-sm text-muted-foreground">Αίθουσα: {st.hallName}</p>
                          ) : null}
                          {st.venueSummerOutdoor ? (
                            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-500">Θερινή προβολή</p>
                          ) : null}
                          {st.price != null ? (
                            <p className="mt-3 text-base font-bold">
                              {Number.isInteger(st.price) ? `${st.price}` : st.price.toFixed(2)} €
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {eventEditorialReviews.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold mb-4">Κριτικές Συντακτών</h2>
            {eventEditorialReviews.map((r) => (
              <div key={r.id} className="card-elevated p-6 border-l-4 border-l-[#13143E] mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-base text-foreground">{r.score}/10</span>
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{r.title}</h3>
                <p className="text-muted-foreground text-base">{r.body}</p>
                <p className="text-sm text-muted-foreground mt-3">— {r.author}</p>
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
                  <span className="font-medium text-base">{r.userName}</span>
                  <span className="text-sm font-bold">{r.rating}/5 ★</span>
                </div>
                <p className="text-base text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </section>
        )}

        <div className="card-elevated p-6 text-center max-w-md mx-auto border-2 border-[#13143E]">
          <h3 className="font-display font-semibold text-lg mb-2">Γράψε Κριτική</h3>
          <p className="text-base text-muted-foreground mb-3">Σύνδεση για να γράψεις κριτική</p>
          <Button variant="outline" size="sm" className="border-foreground text-foreground hover:bg-foreground hover:text-background">Σύνδεση</Button>
        </div>

        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Μπορεί να σου αρέσει</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
            {related.map((item, i) => (
              <div key={item.id} className="flex h-full min-h-0">
                <EventCard
                  slug={item.slug}
                  title={item.title}
                  subtitle={item.director}
                  genre={item.genre}
                  duration={item.duration}
                  score={isMovie ? (item as StrapiMovie).criticScore : undefined}
                  gradientFrom={isMovie ? undefined : (item as StrapiTheaterShow).gradientFrom}
                  gradientTo={isMovie ? undefined : (item as StrapiTheaterShow).gradientTo}
                  posterUrl={isMovie ? (item as StrapiMovie).posterUrl : item.posterUrl}
                  type={type}
                  index={i}
                  className="w-full flex-1"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default EventDetail;
