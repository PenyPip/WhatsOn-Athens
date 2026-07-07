"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import EventCard from "@/components/EventCard";
import { useAuth } from "@/contexts/AuthContext";
import { useDeferUntilLcpDone } from "@/hooks/useDeferUntilLcpDone";
import type { StrapiMovie, StrapiShowtime } from "@/lib/api";
import { movieTitleLines } from "@/lib/movieTitles";
import { resolveImdbRating } from "@/lib/movieImdb";
import { buildMovieShowtimeShareUrl } from "@/lib/movieShowtimeShare";
import { moviesVenueProgramPath } from "@/lib/moviesVenuePath";
import {
  formatNextShowtimeLabel,
  nextShowtimeForMovie,
  personalizedProgramShowtimes,
  showtimeSlotKey,
  uniqueShowtimeSlots,
} from "@/lib/personalizedShowtimes";
import { showtimeIsUpcoming } from "@/lib/showtimeSchedule";
import type { ProfileMovie } from "@/lib/userProfile";

function genreLabel(pm: ProfileMovie, catalog: StrapiMovie | null): string {
  if (catalog?.genre?.trim()) return catalog.genre;
  const labels = (pm.genres ?? []).map((g) => g.label).filter(Boolean);
  return labels.join(" · ");
}

type HomePersonalizedSectionsProps = {
  /** Προαιρετικό — πλούσια αφίσα/srcset όταν η ταινία είναι και στο home catalog. */
  movies?: StrapiMovie[];
  showtimes: StrapiShowtime[];
};

export default function HomePersonalizedSections({ movies, showtimes }: HomePersonalizedSectionsProps) {
  const defer = useDeferUntilLcpDone();
  const { isAuthenticated, profile } = useAuth();
  const now = useMemo(() => new Date(), []);

  const favoriteMovieIds = useMemo(
    () => new Set((profile?.favoriteMovies ?? []).map((m) => m.id)),
    [profile?.favoriteMovies],
  );

  const favoriteVenueIds = useMemo(
    () => new Set((profile?.favoriteVenues ?? []).map((v) => v.id)),
    [profile?.favoriteVenues],
  );

  const nextShowtimeByMovieId = useMemo(() => {
    const map = new Map<number, StrapiShowtime>();
    for (const movieId of favoriteMovieIds) {
      const next = nextShowtimeForMovie(movieId, showtimes, { favoriteVenueIds, now });
      if (next) map.set(movieId, next);
    }
    return map;
  }, [favoriteMovieIds, showtimes, favoriteVenueIds, now]);

  /** Πάντα από profile — όχι το trimmed home `movieList` (λείπουν ταινίες χωρίς προβολή στην αρχική). */
  const favoriteMoviesDisplay = useMemo(() => {
    const fromProfile = profile?.favoriteMovies ?? [];
    if (!fromProfile.length) return [];
    const catalogById = new Map((movies ?? []).map((m) => [m.id, m]));
    return fromProfile.map((pm) => ({
      profile: pm,
      catalog: catalogById.get(pm.id) ?? null,
      nextShowtime: nextShowtimeByMovieId.get(pm.id) ?? null,
    }));
  }, [profile?.favoriteMovies, movies, nextShowtimeByMovieId]);

  const yourProgramShowtimes = useMemo(
    () => personalizedProgramShowtimes(showtimes, favoriteMovieIds, favoriteVenueIds, { now, limit: 16 }),
    [showtimes, favoriteMovieIds, favoriteVenueIds, now],
  );

  const favoriteVenueShowtimes = useMemo(() => {
    if (!favoriteVenueIds.size) return [];
    const filtered = showtimes
      .filter((st) => favoriteVenueIds.has(st.venueId ?? -1) && showtimeIsUpcoming(st, now))
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    return uniqueShowtimeSlots(filtered).slice(0, 24);
  }, [showtimes, favoriteVenueIds, now]);

  const showtimesByVenue = useMemo(() => {
    const map = new Map<number, { venueName: string; venueSlug: string; slots: StrapiShowtime[] }>();
    for (const st of favoriteVenueShowtimes) {
      const key = st.venueId;
      if (key == null) continue;
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

  const profileFavoriteCount = profile?.favoriteMovies?.length ?? 0;
  if (
    !defer ||
    !isAuthenticated ||
    (profileFavoriteCount === 0 && showtimesByVenue.length === 0 && yourProgramShowtimes.length === 0)
  ) {
    return null;
  }

  return (
    <>
      {yourProgramShowtimes.length > 0 ? (
        <section className="relative section-black border-y border-white/[0.07] py-10 md:py-12">
          <div className="container max-w-7xl">
            <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-amber-200/85">
              Για σένα
            </span>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Το πρόγραμμά σου</h2>
            <p className="mt-1 font-body text-sm text-white/70">
              Οι αγαπημένες σου ταινίες, στα αγαπημένα σου σινεμά
            </p>
            <ul className="mt-6 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {yourProgramShowtimes.map((st) => {
                const slug = st.movieSlug?.trim();
                const movieHref = slug
                  ? buildMovieShowtimeShareUrl(slug, { showtimeId: st.id })
                  : "/movies";
                return (
                  <li
                    key={showtimeSlotKey(st)}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3"
                  >
                    <Link to={movieHref} className="font-display text-base font-semibold text-white hover:underline">
                      {st.movieTitle}
                    </Link>
                    <p className="mt-1 font-body text-sm text-amber-100/95">{formatNextShowtimeLabel(st, now)}</p>
                    {st.venueSlug?.trim() ? (
                      <Link
                        to={moviesVenueProgramPath(st.venueSlug)}
                        className="mt-2 inline-block text-xs font-medium uppercase tracking-wide text-white/60 hover:text-amber-100/90"
                      >
                        {st.venue}
                      </Link>
                    ) : (
                      <p className="mt-2 text-xs text-white/60">{st.venue}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {favoriteMoviesDisplay.length > 0 ? (
        <section className="relative border-y border-[#13143E]/20 bg-[#F7F5FC] py-10 md:py-12">
          <div className="container max-w-7xl">
            <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.22em] text-[#13143E]/55">
              Για σένα
            </span>
            <h2 className="font-display text-2xl font-bold text-[#13143E] md:text-3xl">Οι ταινίες σου</h2>
            <p className="mt-1 font-body text-sm text-[#13143E]/65">Αγαπημένες ταινίες — επόμενη προβολή</p>
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {favoriteMoviesDisplay.map(({ profile: pm, catalog, nextShowtime }) => {
                const tl = movieTitleLines({
                  title: catalog?.title ?? pm.title,
                  originalTitle: catalog?.originalTitle ?? pm.originalTitle,
                });
                const subtitle = nextShowtime
                  ? formatNextShowtimeLabel(nextShowtime, now)
                  : "Δεν παίζει σύντομα";
                return (
                  <div key={pm.id} className="w-[9.5rem] shrink-0 sm:w-[10.5rem]">
                    <EventCard
                      slug={pm.slug}
                      title={tl.primary}
                      titleSecondary={tl.secondary}
                      subtitle={subtitle}
                      genre={genreLabel(pm, catalog)}
                      duration={catalog?.duration ?? 0}
                      imdbRating={catalog ? resolveImdbRating(catalog) : pm.imdbRating ?? undefined}
                      posterUrl={catalog?.posterUrl ?? pm.posterUrl ?? undefined}
                      posterSrcSet={catalog?.posterSrcSet}
                      isDubbed={catalog?.isDubbed ?? pm.isDubbed}
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
                        <p className="mt-0.5 text-xs text-white/55">{formatNextShowtimeLabel(st, now)}</p>
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
