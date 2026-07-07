"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import EventCard from "@/components/EventCard";
import { useAuth } from "@/contexts/AuthContext";
import { useDeferUntilLcpDone } from "@/hooks/useDeferUntilLcpDone";
import type { StrapiMovie, StrapiShowtime } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import { resolveImdbRating } from "@/lib/movieImdb";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";

function showtimeSlotKey(st: StrapiShowtime): string {
  const movie = st.movieId ?? st.movieSlug ?? st.movieTitle ?? "";
  const hall = st.hallId ?? st.hallName ?? "";
  return `${movie}|${st.datetime}|${hall}`;
}

/** Μία κάρτα ανά προβολή — το API μπορεί να επιστρέφει διπλότυπα rows. */
function uniqueShowtimeSlots(list: StrapiShowtime[]): StrapiShowtime[] {
  const seen = new Set<string>();
  const out: StrapiShowtime[] = [];
  for (const st of list) {
    const key = showtimeSlotKey(st);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(st);
  }
  return out;
}

type HomePersonalizedSectionsProps = {
  movies: StrapiMovie[];
  showtimes: StrapiShowtime[];
};

export default function HomePersonalizedSections({ movies, showtimes }: HomePersonalizedSectionsProps) {
  const defer = useDeferUntilLcpDone();
  const { isAuthenticated, profile } = useAuth();

  const favoriteMovieIds = useMemo(
    () => new Set((profile?.favoriteMovies ?? []).map((m) => m.id)),
    [profile?.favoriteMovies],
  );
  const favoriteVenueIds = useMemo(
    () => new Set((profile?.favoriteVenues ?? []).map((v) => v.id)),
    [profile?.favoriteVenues],
  );

  const favoriteMovies = useMemo(() => {
    if (!favoriteMovieIds.size) return [];
    const picked = movies.filter((m) => favoriteMovieIds.has(m.id));
    const order = new Map([...favoriteMovieIds].map((id, i) => [id, i]));
    return [...picked].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  }, [movies, favoriteMovieIds]);

  const favoriteVenueShowtimes = useMemo(() => {
    if (!favoriteVenueIds.size) return [];
    const now = Date.now();
    const filtered = showtimes
      .filter((st) => favoriteVenueIds.has(st.venueId) && new Date(st.datetime).getTime() >= now)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    return uniqueShowtimeSlots(filtered).slice(0, 24);
  }, [showtimes, favoriteVenueIds]);

  const showtimesByVenue = useMemo(() => {
    const map = new Map<number, { venueName: string; venueSlug: string; slots: StrapiShowtime[] }>();
    for (const st of favoriteVenueShowtimes) {
      const key = st.venueId;
      if (!map.has(key)) {
        map.set(key, { venueName: st.venue, venueSlug: st.venueSlug ?? "", slots: [] });
      }
      const group = map.get(key)!;
      const slotKey = showtimeSlotKey(st);
      if (!group.slots.some((s) => showtimeSlotKey(s) === slotKey)) {
        group.slots.push(st);
      }
    }
    return [...map.values()];
  }, [favoriteVenueShowtimes]);

  if (!defer || !isAuthenticated || (!favoriteMovies.length && !showtimesByVenue.length)) {
    return null;
  }

  return (
    <>
      {favoriteMovies.length > 0 ? (
        <section className="relative border-y border-[#13143E]/20 bg-[#F7F5FC] py-10 md:py-12">
          <div className="container max-w-7xl">
            <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-[#13143E]/55">
              Για σένα
            </span>
            <h2 className="font-display text-2xl font-bold text-[#13143E] md:text-3xl">Οι ταινίες σου</h2>
            <p className="mt-1 font-body text-sm text-[#13143E]/65">Αγαπημένες ταινίες που παρακολουθείς</p>
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {favoriteMovies.map((movie) => {
                const tl = movieTitleLines(movie);
                return (
                  <div key={movie.id} className="w-[9.5rem] shrink-0 sm:w-[10.5rem]">
                    <EventCard
                      slug={movie.slug}
                      title={tl.primary}
                      titleSecondary={tl.secondary}
                      subtitle=""
                      genre={movie.genre || ""}
                      duration={movie.duration}
                      imdbRating={resolveImdbRating(movie)}
                      posterUrl={movie.posterUrl}
                      posterSrcSet={movie.posterSrcSet}
                      isDubbed={movie.isDubbed}
                      type="movie"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {showtimesByVenue.length > 0 ? (
        <section className="relative section-black border-y border-white/[0.07] py-10 md:py-12">
          <div className="container max-w-7xl">
            <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-amber-200/85">
              Για σένα
            </span>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Τα σινεμά σου</h2>
            <p className="mt-1 font-body text-sm text-white/65">Τι παίζει στους αγαπημένους σου κινηματογράφους</p>
            <ul className="mt-8 grid list-none gap-4">
              {showtimesByVenue.map((group) => (
                <li key={group.venueSlug} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-white">{group.venueName}</h3>
                    <Link
                      to={moviesVenueProgramPath(group.venueSlug)}
                      className="text-xs font-medium uppercase tracking-wide text-amber-200/90 hover:text-amber-100"
                    >
                      Όλο το πρόγραμμα
                    </Link>
                  </div>
                  <ul className="grid list-none gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.slots.slice(0, 6).map((st) => (
                      <li key={showtimeSlotKey(st)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/85">
                        <Link to={`/movies/${st.movieSlug}`} className="font-medium text-white hover:underline">
                          {st.movieTitle}
                        </Link>
                        <p className="mt-0.5 text-xs text-white/55">
                          {new Date(st.datetime).toLocaleString("el-GR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
