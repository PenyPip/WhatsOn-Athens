import { useParams, Link } from "react-router-dom";
import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Clock, Globe, Users, ArrowLeft, MapPin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMovies,
  useTheaterShows,
  useEditorialReviews,
  useUserReviews,
  useShowtimes,
  useMovieBySlug,
  useMovieGenreCatalog,
  useMovieGenres,
  useVenues,
} from "@/hooks/useStrapi";
import EventCard from "@/components/EventCard";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";
import {
  normalizeCastFromStrapi,
  resolveMovieGenreLine,
  type StrapiMovie,
  type StrapiShowtime,
  type StrapiTheaterShow,
} from "@/lib/api";
import { movieTitleLines, posterAltForMovie, posterAltForTheater } from "@/lib/movieTitles";
import { showtimeIsUpcoming, showtimeShowsOutdoorLabel, enrichMoviesWithShowtimeGenre } from "@/lib/homeMovieFilters";
import SummerScreeningIndicator from "@/components/SummerScreeningIndicator";
import { SHOW_WRITE_REVIEW_CTA } from "@/lib/siteVisibility";
import { cn } from "@/lib/utils";
import { usePageSeo } from "@/hooks/usePageSeo";
import { moviePageDescription, staticPageSeo, theaterPageDescription } from "@/lib/pageSeoCopy";
import { buildMovieDetailJsonLd } from "@/lib/jsonLdMovieDetail";
import { buildTheaterDetailJsonLd } from "@/lib/jsonLdTheaterDetail";
import JsonLd from "@/components/JsonLd";
import GenreLinks from "@/components/GenreLinks";
import CinemaVenueLinks from "@/components/CinemaVenueLinks";
import VenueBookingLink from "@/components/VenueBookingLink";
import ShowtimesExpandable from "@/components/ShowtimesExpandable";
import { movieGenreLinkItems } from "@/lib/movieGenreLinks";
import {
  cinemaGroupKey,
  isValidExternalUrl,
  moviesHrefForShowtimes,
  resolveCinemaGroupFromShowtimes,
} from "@/lib/venueResolve";

/** Γραμμή προβολής (ημερομηνία, ώρα, αίθουσα κ.λπ.) · χρησιμοποιείται και στη λίστα όλων των προβολών στη σελίδα ταινίας. */
function ShowtimeCompactRow({ st, emphasized = false }: { st: StrapiShowtime; emphasized?: boolean }) {
  const d = new Date(st.datetime);
  return (
    <li
      className={cn(
        "flex flex-col gap-1.5 border-b border-border/80 last:border-0 sm:flex-row sm:items-center sm:justify-between",
        emphasized ? "py-3 text-sm sm:py-3.5" : "py-3.5 text-sm",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className={cn("capitalize text-foreground", emphasized ? "text-sm text-muted-foreground" : "font-medium")}>
          {d.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <span
          className={cn(
            "font-semibold tabular-nums text-[#13143E]",
            emphasized ? "text-base" : "text-lg",
          )}
        >
          {d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        {st.hallName ? <span>Αίθουσα · {st.hallName}</span> : null}
        {showtimeShowsOutdoorLabel(st) ? <SummerScreeningIndicator className="text-amber-600" /> : null}
        {st.price != null ? (
          <span className="font-semibold text-foreground">
            {Number.isInteger(st.price) ? `${st.price}` : st.price.toFixed(2)} €
          </span>
        ) : null}
      </div>
    </li>
  );
}

/** YouTube watch / youtu.be / embed → URL για iframe. */
function youtubeEmbedUrl(raw: string | undefined): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.hostname === "youtu.be" || u.hostname.endsWith(".youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      const fromQuery = u.searchParams.get("v");
      if (fromQuery) return `https://www.youtube.com/embed/${fromQuery}`;
      const fromPath = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      if (fromPath?.[1]) return `https://www.youtube.com/embed/${fromPath[1]}`;
    }
  } catch {
    return null;
  }
  return null;
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
  const { data: genreCatalog } = useMovieGenreCatalog();
  const { data: movieGenresList } = useMovieGenres();
  const { data: venues } = useVenues();

  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies ?? [], showtimes ?? []),
    [movies, showtimes],
  );

  const movieFromList = useMemo(
    () => (type === "movie" && slug ? moviesEnriched?.find((m) => m.slug === slug) : undefined),
    [type, moviesEnriched, slug],
  );

  const { data: movieBySlug, isLoading: movieBySlugLoading } = useMovieBySlug(
    type === "movie" && slug ? slug : "",
  );

  const event =
    type === "movie"
      ? movieBySlug ?? movieFromList
      : theaterShows?.find((s) => s.slug === slug);

  const isLoading =
    type === "movie"
      ? moviesLoading || (!!slug && !movieFromList && movieBySlugLoading)
      : theaterLoading;
  const eventShowtimes = useMemo((): StrapiShowtime[] => {
    const list = showtimes ?? [];
    if (!slug || type !== "movie") return [];
    const now = new Date();
    const filtered = list.filter((st) => st.movieSlug === slug && showtimeIsUpcoming(st, now));
    return [...filtered].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [showtimes, slug, type]);

  const showtimesByVenue = useMemo(() => {
    const m = new Map<string, StrapiShowtime[]>();
    for (const st of eventShowtimes) {
      const key = cinemaGroupKey(st, venues);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(st);
    }
    return [...m.entries()]
      .map(([key, slots]) => {
        const sorted = [...slots].sort(
          (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
        );
        const { venueName, venue } = resolveCinemaGroupFromShowtimes(sorted, venues);
        return { key, venueName, slots: sorted, venue };
      })
      .sort((a, b) => a.venueName.localeCompare(b.venueName, "el"));
  }, [eventShowtimes, venues]);

  const genreLabel = useMemo(() => {
    if (!event) return "";
    const isM = type === "movie";
    const mov = isM ? (event as StrapiMovie) : null;
    if (!isM || !mov) return (event.genre ?? "").trim();
    const fromMovie = resolveMovieGenreLine(mov.id, mov.slug, mov, genreCatalog?.linkIndex);
    if (fromMovie) return fromMovie;
    const list = showtimes ?? [];
    const st =
      list.find((s) => s.movieId != null && Number(s.movieId) === Number(mov.id) && (s.movieGenre ?? "").trim()) ??
      list.find((s) => typeof slug === "string" && s.movieSlug === slug && (s.movieGenre ?? "").trim());
    return (st?.movieGenre ?? "").trim();
  }, [event, type, showtimes, slug, genreCatalog]);

  const castList = useMemo((): string[] => (event ? normalizeCastFromStrapi(event.cast) : []), [event]);

  const isMovieEarly = type === "movie";
  const movieEarly = isMovieEarly && event ? (event as StrapiMovie) : null;
  const theaterEarly = type === "theater" && event ? (event as StrapiTheaterShow) : null;

  const genreLinkItems = useMemo(
    () => (movieEarly ? movieGenreLinkItems(movieEarly, movieGenresList) : []),
    [movieEarly, movieGenresList],
  );

  const detailJsonLd = useMemo(() => {
    if (isLoading || !event || !slug) return null;
    if (movieEarly) {
      return buildMovieDetailJsonLd({
        movie: movieEarly,
        slug,
        genreLabel,
        showtimes: eventShowtimes,
        venues: venues ?? [],
      });
    }
    if (theaterEarly) {
      return buildTheaterDetailJsonLd({ show: theaterEarly, slug });
    }
    return null;
  }, [isLoading, event, slug, movieEarly, theaterEarly, genreLabel, eventShowtimes, venues]);

  usePageSeo(
    useMemo(() => {
      if (isLoading) {
        return { title: type === "movie" ? "Ταινία" : "Παράσταση", enabled: false };
      }
      if (!event) {
        return {
          ...staticPageSeo.notFound,
          path: slug ? (type === "movie" ? `/movies/${slug}` : `/theater/${slug}`) : undefined,
        };
      }
      if (isMovieEarly && movieEarly) {
        const tl = movieTitleLines(movieEarly);
        return {
          title: tl.primary,
          description: moviePageDescription(movieEarly, genreLabel),
          path: `/movies/${slug}`,
          image: movieEarly.posterUrl,
          imageAlt: posterAltForMovie(movieEarly),
          ogType: "video.movie" as const,
          videoUrl: youtubeEmbedUrl(movieEarly.trailerUrl) ?? undefined,
        };
      }
      const show = event as StrapiTheaterShow;
      return {
        title: show.title,
        description: theaterPageDescription(show),
        path: `/theater/${slug}`,
        image: show.posterUrl,
        imageAlt: posterAltForTheater(show.title),
        ogType: "article" as const,
      };
    }, [isLoading, event, type, slug, genreLabel, isMovieEarly, movieEarly]),
  );

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
    ? (moviesEnriched ?? []).filter((m) => m.slug !== slug).slice(0, 4)
    : (theaterShows ?? []).filter((s) => s.slug !== slug).slice(0, 4);

  const eventEditorialReviews = (editorialReviews ?? []).filter((r) =>
    isMovie && movie ? reviewContentMatchesMovie(r.contentTitle, movie) : r.contentTitle === event.title,
  );
  const eventUserReviews = (userReviews ?? []).filter((r) =>
    isMovie && movie ? reviewContentMatchesMovie(r.contentTitle, movie) : r.contentTitle === event.title,
  );

  const headline = isMovie && movie ? movieTitleLines(movie) : { primary: event.title, secondary: undefined as string | undefined };

  const hasCast = castList.length > 0;
  const showCriticScoreBadge =
    Boolean(movie) && eventEditorialReviews.length > 0 && Number(movie?.criticScore) > 0;

  const directorLabel = (event.director ?? "").trim();
  const hasDirector = directorLabel.length > 0;
  const hasDuration = typeof event.duration === "number" && Number.isFinite(event.duration) && event.duration > 0;
  /** Για ταινίες: πάντα τμήμα «Πληροφορίες» ώστε να εμφανίζεται έστω και μόνο το είδος. */
  const hasInfoBlock = isMovie || hasDirector || hasCast || Boolean(genreLabel) || hasDuration;
  const trailerEmbedUrl = isMovie && movie ? youtubeEmbedUrl(movie.trailerUrl) : null;

  const infoField = (label: string, value: ReactNode) => (
    <div className="min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-0.5 text-sm font-medium leading-snug text-foreground">{value}</div>
    </div>
  );

  const movieInfoAside = hasInfoBlock ? (
    <aside className="card-elevated mx-auto h-fit w-full max-w-[280px] rounded-2xl p-4 md:mx-0 md:max-w-[260px] md:sticky md:top-28 lg:top-32">
      <h2 className="font-display mb-3 text-center text-sm font-semibold md:text-left">Πληροφορίες</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {hasDirector ? infoField("Σκηνοθεσία", directorLabel) : null}
        {isMovie ? (
          infoField(
            "Είδος",
            genreLinkItems.length ? (
              <GenreLinks items={genreLinkItems} />
            ) : genreLabel ? (
              <span className="line-clamp-3 text-xs leading-snug">{genreLabel}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
          )
        ) : genreLabel ? (
          infoField("Είδος", genreLabel)
        ) : null}
        {hasDuration ? infoField("Διάρκεια", `${event.duration}′`) : null}
        {movie?.language?.trim() ? infoField("Γλώσσα", movie.language.trim()) : null}
        {movie?.isDubbed ? infoField("Ήχος", "Μεταγλωτ.") : null}
        {movie?.releaseDate?.trim()
          ? infoField(
              "Κυκλοφορία",
              new Date(movie.releaseDate.trim() + "T12:00:00").toLocaleDateString("el-GR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            )
          : null}
      </div>
      {hasCast ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ηθοποιοί</p>
          <ul className="mt-1.5 flex flex-wrap gap-1" role="list">
            {castList.slice(0, 6).map((name, i) => (
              <li key={`${name}-${i}`}>
                <span className="inline-flex max-w-full items-center rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[11px] font-medium leading-snug text-foreground">
                  {name}
                </span>
              </li>
            ))}
            {castList.length > 6 ? (
              <li className="text-[11px] text-muted-foreground">+{castList.length - 6}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </aside>
  ) : null;

  const movieShowtimesSection = isMovie ? (
    <section
      id="showtimes"
      className="scroll-mt-24 rounded-xl border border-[#13143E]/12 bg-[#13143E]/[0.03] p-4 md:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5 md:mb-5">
        <MapPin className="h-4 w-4 shrink-0 text-[#13143E]/70" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground md:text-xl">Πού & πότε παίζεται</h2>
        </div>
      </div>
      {eventShowtimes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν επερχόμενες προβολές.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {showtimesByVenue.map(({ key, venueName, slots, venue }) => {
            if (!slots.length) return null;
            return (
              <div
                key={key}
                className="flex min-h-0 flex-col rounded-lg border border-border/80 bg-card/50 p-3 sm:p-4"
              >
                <div className="mb-2 border-b border-border/60 pb-2">
                  <CinemaVenueLinks
                    venueName={venueName}
                    venue={venue}
                    programHref={moviesHrefForShowtimes(slots, venues, key)}
                    showProgramButton
                    compact
                  />
                </div>
                <ShowtimesExpandable listClassName="min-h-0 flex-1">
                  {slots.map((st) => (
                    <ShowtimeCompactRow key={st.id} st={st} emphasized />
                  ))}
                </ShowtimesExpandable>
                {isValidExternalUrl(venue?.moreLink) ? (
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <VenueBookingLink venue={venue} compact />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  ) : null;

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {detailJsonLd ? <JsonLd data={detailJsonLd} /> : null}
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
              alt={posterAltForMovie(movie)}
              width={1200}
              height={1800}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          </>
        ) : !isMovie && (event as StrapiTheaterShow).posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(event as StrapiTheaterShow).posterUrl}
              alt={posterAltForTheater((event as StrapiTheaterShow).title)}
              width={1200}
              height={1800}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#13143E]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13143E] via-transparent to-transparent" />

        <div className="relative z-10 container flex h-full items-end pb-8 pt-20 md:pb-12 md:pt-36">
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
              {movie ? (
                genreLinkItems.length ? (
                  <GenreLinks items={genreLinkItems} prefix="Είδος" variant="hero" />
                ) : genreLabel ? (
                  <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white">
                    Είδος · {genreLabel}
                  </span>
                ) : (
                  <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm font-medium text-white/75">
                    Είδος · —
                  </span>
                )
              ) : genreLabel ? (
                <span>{genreLabel}</span>
              ) : null}
              {movie?.isDubbed ? (
                <span className="rounded border border-amber-400/50 bg-amber-500/25 px-2 py-0.5 text-sm font-semibold text-amber-100">
                  Μεταγλωτισμένη
                </span>
              ) : null}
              {movie?.language?.trim() ? (
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" /> {movie.language.trim()}
                </span>
              ) : null}
              {!isMovie && <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {(event as StrapiTheaterShow).venue}</span>}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#showtimes"
                className="inline-flex items-center rounded bg-white px-6 py-3 text-base font-semibold text-[#13143E] transition-colors hover:bg-white/90"
              >
                Προβολές & τιμές
              </a>
              {isMovie ? (
                <a
                  href="#trailer"
                  className="inline-flex items-center gap-1.5 rounded border border-white/35 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <Play className="h-4 w-4 shrink-0" aria-hidden />
                  Τρέιλερ
                </a>
              ) : null}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mt-8 space-y-10 md:mt-10 md:space-y-12">
        {movieShowtimesSection}

        {isMovie ? (
          <>
            <motion.section
              className="max-w-5xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className={cn(
                  "grid gap-6 md:gap-8",
                  hasInfoBlock && "md:grid-cols-[minmax(0,1fr)_auto] md:items-start",
                )}
              >
                <div className="min-w-0">
                  <h2 className="font-display mb-3 text-xl font-semibold">Υπόθεση</h2>
                  <p className="text-base leading-relaxed text-muted-foreground">{event.synopsis}</p>
                </div>
                {movieInfoAside}
              </div>
            </motion.section>

            <section id="trailer" className="max-w-3xl scroll-mt-24">
              <h2 className="font-display mb-4 text-xl font-semibold">Τρέιλερ</h2>
              {trailerEmbedUrl ? (
                <div className="aspect-video max-w-xl overflow-hidden rounded-xl border border-border/80 bg-black shadow-sm">
                  <iframe
                    title={`Τρέιλερ — ${headline.primary}`}
                    src={trailerEmbedUrl}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Δεν υπάρχει διαθέσιμο τρέιλερ για αυτή την ταινία.</p>
              )}
            </section>
          </>
        ) : (
          <>
            <motion.section
              className="max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="font-display mb-3 text-xl font-semibold">Υπόθεση</h2>
              <p className="text-base leading-relaxed text-muted-foreground">{event.synopsis}</p>
            </motion.section>
            {movieInfoAside}
          </>
        )}

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

        {SHOW_WRITE_REVIEW_CTA ? (
          <div className="card-elevated p-6 text-center max-w-md mx-auto border-2 border-[#13143E]">
            <h3 className="font-display font-semibold text-lg mb-2">Γράψε Κριτική</h3>
            <p className="text-base text-muted-foreground mb-3">Σύνδεση για να γράψεις κριτική</p>
            <Button variant="outline" size="sm" className="border-foreground text-foreground hover:bg-foreground hover:text-background" asChild>
              <Link to="/profile">Σύνδεση</Link>
            </Button>
          </div>
        ) : null}

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
                  isDubbed={isMovie ? (item as StrapiMovie).isDubbed : false}
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