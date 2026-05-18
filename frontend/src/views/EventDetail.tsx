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
import { movieTitleLines } from "@/lib/movieTitles";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/** Συμπαγής γραμμή για επιπλέον προβολές στο ίδιο σινεμά (όχι πλήρης κάρτα). */
function ShowtimeCompactRow({ st }: { st: StrapiShowtime }) {
  const d = new Date(st.datetime);
  return (
    <li className="flex flex-col gap-1.5 border-b border-border/80 py-3.5 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-medium capitalize text-foreground">
          {d.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <span className="text-lg font-bold tabular-nums text-[#13143E]">
          {d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        {st.hallName ? <span>Αίθουσα · {st.hallName}</span> : null}
        {st.venueSummerOutdoor ? <span className="text-xs font-semibold uppercase text-amber-700">Θερινό</span> : null}
        {st.price != null ? (
          <span className="font-semibold text-foreground">
            {Number.isInteger(st.price) ? `${st.price}` : st.price.toFixed(2)} €
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ShowtimeSlotCard({ st }: { st: StrapiShowtime }) {
  const d = new Date(st.datetime);
  return (
    <div className="rounded-xl border-2 border-[#13143E]/20 bg-white p-5 text-left shadow-[0_10px_40px_rgba(19,20,62,0.14)] ring-1 ring-black/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ημερομηνία</p>
      <p className="mt-1.5 text-base font-semibold leading-snug text-foreground sm:text-lg">
        {d.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ώρα έναρξης</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#13143E]">
        {d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false })}
      </p>
      {st.hallName ? <p className="mt-3 text-sm font-medium text-muted-foreground">Αίθουσα · {st.hallName}</p> : null}
      {st.venueSummerOutdoor ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Θερινή προβολή</p>
      ) : null}
      {st.price != null ? (
        <p className="mt-4 border-t border-border/60 pt-3 text-lg font-bold text-foreground">
          {Number.isInteger(st.price) ? `${st.price}` : st.price.toFixed(2)} €
        </p>
      ) : null}
    </div>
  );
}

function reviewContentMatchesMovie(contentTitle: string, movie: StrapiMovie): boolean {
  const ct = contentTitle.trim();
  if (!ct) return false;
  const tl = movieTitleLines(movie);
  const variants = new Set(
    [movie.title, movie.originalTitle, tl.primary, tl.secondary]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean),
  );
  return variants.has(ct);
}

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

  const castList = useMemo((): string[] => {
    if (!event || !Array.isArray(event.cast)) return [];
    return event.cast
      .filter((c): c is string => typeof c === "string" && c.trim() !== "")
      .map((c) => c.trim());
  }, [event]);

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

  const eventEditorialReviews = (editorialReviews ?? []).filter((r) =>
    isMovie && movie ? reviewContentMatchesMovie(r.contentTitle, movie) : r.contentTitle === event.title,
  );
  const eventUserReviews = (userReviews ?? []).filter((r) =>
    isMovie && movie ? reviewContentMatchesMovie(r.contentTitle, movie) : r.contentTitle === event.title,
  );

  const headline = isMovie && movie ? movieTitleLines(movie) : { primary: event.title, secondary: undefined as string | undefined };

  const genreLabel = (movie ? movie.genre : event.genre ?? "").trim();
  const hasCast = castList.length > 0;
  const showCriticScoreBadge =
    Boolean(movie) && eventEditorialReviews.length > 0 && Number(movie?.criticScore) > 0;

  const directorLabel = (event.director ?? "").trim();
  const hasDirector = directorLabel.length > 0;
  const hasDuration = typeof event.duration === "number" && Number.isFinite(event.duration) && event.duration > 0;
  const hasInfoBlock = hasDirector || hasCast || Boolean(genreLabel) || hasDuration;

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

            {movie && (showCriticScoreBadge || movie.ageRating?.trim()) ? (
              <div className="flex items-center gap-3 mb-3">
                {showCriticScoreBadge ? (
                  <span className="px-2 py-0.5 bg-white text-sm font-bold text-[#13143E] rounded">{movie.criticScore}/10</span>
                ) : null}
                {movie.ageRating?.trim() ? (
                  <span className="text-sm text-white/60">{movie.ageRating}</span>
                ) : null}
              </div>
            ) : null}

            <h1
              className={`font-display text-3xl md:text-5xl font-bold text-white ${
                headline.secondary ? "mb-2" : "mb-4"
              }`}
            >
              {headline.primary}
            </h1>
            {headline.secondary ? (
              <p className="font-display text-xl md:text-3xl font-medium text-white/85 mb-4">{headline.secondary}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 text-base text-white/60 mb-6">
              {hasDuration ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {event.duration} λεπτά
                </span>
              ) : null}
              {movie && genreLabel ? (
                <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white">
                  Είδος · {genreLabel}
                </span>
              ) : null}
              {!movie && genreLabel ? <span>{genreLabel}</span> : null}
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

        {hasInfoBlock ? (
        <section className="card-elevated p-6 max-w-2xl">
          <h2 className="font-display text-lg font-semibold mb-4">Πληροφορίες</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
            {hasDirector ? (
              <div className="min-w-0">
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Σκηνοθεσία</span>
                <p className="font-medium text-base mt-1">{directorLabel}</p>
              </div>
            ) : null}
            {genreLabel ? (
              <div className="min-w-0">
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Είδος</span>
                <p className="font-medium text-base mt-1">{genreLabel}</p>
              </div>
            ) : null}
            {hasDuration ? (
              <div className="min-w-0">
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Διάρκεια</span>
                <p className="font-medium text-base mt-1">{event.duration} λεπτά</p>
              </div>
            ) : null}
          </div>
          {hasCast ? (
            <div className="mt-6 border-t border-border pt-6">
              <p className="text-muted-foreground text-sm uppercase tracking-wider">Ηθοποιοί</p>
              <ul className="mt-3 flex flex-wrap gap-2" role="list">
                {castList.map((name, i) => (
                  <li key={`${name}-${i}`}>
                    <span className="inline-flex max-w-full items-center rounded-lg border border-border bg-muted/45 px-3 py-1.5 text-sm font-medium leading-snug text-foreground">
                      {name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        ) : null}

        <section id="showtimes">
          <h2 className="font-display text-xl font-semibold mb-2">Πού παίζει & ώρες</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
            Για κάθε σινεμά εμφανίζεται η πρώτη διαθέσιμη προβολή· αν υπάρχουν κι άλλες ώρες στο ίδιο χώρο, τις βλέπεις στο «Περισσότερες ώρες».
          </p>
          {eventShowtimes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Δεν έχουν καταχωρηθεί προβολές ακόμη.</p>
          ) : (
            <div className="space-y-12 max-w-5xl">
              {showtimesByVenue.map(({ venueName, slots }, vi) => {
                const [primary, ...extras] = slots;
                if (!primary) return null;
                return (
                <div key={venueName}>
                  <h3 className="font-display text-lg font-semibold mb-4 border-b border-border pb-2 text-foreground">
                    {venueName}
                  </h3>
                  <div className="max-w-lg">
                    <ShowtimeSlotCard st={primary} />
                  </div>
                  {extras.length > 0 ? (
                    <>
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        Υπάρχουν <strong className="text-foreground">{extras.length}</strong> ακόμη προβολ{extras.length === 1 ? "ή" : "ές"} σε αυτό το σινεμά.
                        Άνοιξε «Περισσότερες ώρες» για ημερομηνία, ώρα και τιμή κάθε προβολής.
                      </p>
                      <Accordion type="single" collapsible className="mt-3 w-full max-w-2xl rounded-xl border border-border bg-muted/25">
                        <AccordionItem value={`venue-extra-${vi}`} className="border-0">
                          <AccordionTrigger className="px-4 py-3 text-left text-sm font-semibold text-foreground hover:no-underline [&[data-state=open]]:bg-muted/50">
                            Περισσότερες ώρες ({extras.length})
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 pt-0">
                            <ul className="rounded-lg border border-border/80 bg-card/40 px-3 sm:px-4">
                              {extras.map((st) => (
                                <ShowtimeCompactRow key={st.id} st={st} />
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </>
                  ) : null}
                </div>
                );
              })}
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
          <Button variant="outline" size="sm" className="border-foreground text-foreground hover:bg-foreground hover:text-background" asChild>
            <Link to="/profile">Σύνδεση</Link>
          </Button>
        </div>

        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Μπορεί να σου αρέσει</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
            {related.map((item, i) => {
              const itemTl = isMovie ? movieTitleLines(item as StrapiMovie) : { primary: item.title, secondary: undefined as string | undefined };
              return (
              <div key={item.id} className="flex h-full min-h-0">
                <EventCard
                  slug={item.slug}
                  title={itemTl.primary}
                  titleSecondary={itemTl.secondary}
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
            );})}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default EventDetail;
