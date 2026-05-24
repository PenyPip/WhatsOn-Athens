import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Clapperboard, Loader2, Search } from "lucide-react";
import { useMovies, useVenues, useShowtimes } from "@/hooks/useStrapi";
import type { StrapiMovie, StrapiVenue } from "@/lib/api";
import { movieTitleLines, movieTitlesSearchBlob } from "@/lib/movieTitles";
import { enrichMoviesWithShowtimeGenre } from "@/lib/homeMovieFilters";
import { venueKindLabel } from "@/lib/venueType";
import { textMatchesSearch } from "@/lib/searchTokens";
import { cn } from "@/lib/utils";

function movieMatches(movie: StrapiMovie, q: string): boolean {
  return textMatchesSearch(movieTitlesSearchBlob(movie), q);
}

function venueMatches(venue: StrapiVenue, q: string): boolean {
  const hay = [
    venue.name ?? "",
    venue.slug ?? "",
    venue.address ?? "",
    venueKindLabel(venue.type),
    venue.type,
    venue.city ?? "",
    "37Ν",
    "37n",
  ].join(" ");
  return textMatchesSearch(hay, q);
}

function cmpVenueNames(a: StrapiVenue, b: StrapiVenue): number {
  return (a.name ?? "").localeCompare(b.name ?? "", "el");
}

const CAP_EMPTY = 10;

export type NavSearchHandle = {
  focus: () => void;
};

type NavSearchProps = {
  className?: string;
  inputClassName?: string;
};

export const NavSearch = forwardRef<NavSearchHandle, NavSearchProps>(function NavSearch(
  { className = "", inputClassName = "" },
  ref,
) {
  const navigate = useNavigate();
  const uid = useId();
  const inputId = `nav-search-input${uid.replace(/:/g, "")}`;
  const panelId = `nav-search-results${uid.replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: movies, isLoading: moviesLoading, isError: moviesError } = useMovies();
  const { data: showtimes } = useShowtimes();
  const { data: venues, isLoading: venuesLoading, isError: venuesError } = useVenues();

  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies ?? [], showtimes ?? []),
    [movies, showtimes],
  );

  const loading = moviesLoading || venuesLoading;
  const listsError = moviesError || venuesError;

  const close = useCallback(() => {
    setPanelOpen(false);
    setSearch("");
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setPanelOpen(true);
      inputRef.current?.focus({ preventScroll: true });
    },
  }));

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [panelOpen]);

  const movieHits = useMemo(() => {
    const list = moviesEnriched ?? [];
    const trimmed = search.trim();
    let out = trimmed
      ? list.filter((m) => movieMatches(m, trimmed))
      : [...list].sort((a, b) =>
          movieTitleLines(a).primary.localeCompare(movieTitleLines(b).primary, "el"),
        );
    if (!trimmed) out = out.slice(0, CAP_EMPTY);
    return out.slice(0, 50);
  }, [moviesEnriched, search]);

  const venueHits = useMemo(() => {
    const list = venues ?? [];
    const trimmed = search.trim();
    let out = trimmed ? list.filter((v) => venueMatches(v, trimmed)) : [...list].sort(cmpVenueNames);
    if (!trimmed) out = out.slice(0, CAP_EMPTY);
    return out.slice(0, 50);
  }, [venues, search]);

  const hasHits = movieHits.length > 0 || venueHits.length > 0;
  const showPanel = panelOpen;

  const runMovie = useCallback(
    (slug: string) => {
      if (!slug?.trim()) return;
      close();
      navigate(`/movies/${slug.trim()}`);
    },
    [close, navigate],
  );

  const runVenue = useCallback(
    (slug: string) => {
      if (!slug?.trim()) return;
      close();
      navigate(`/movies/venue/${encodeURIComponent(slug.trim())}`);
    },
    [close, navigate],
  );

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setPanelOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <label htmlFor={inputId} className="sr-only">
        Αναζήτηση ταινίας ή χώρου
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/20 bg-black/25 text-white/70 transition",
          "focus-within:border-white/35 focus-within:bg-black/35 focus-within:text-white",
          inputClassName,
        )}
      >
        <Search className="ml-3 h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setPanelOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Ταινίες, χώροι…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={showPanel ? panelId : undefined}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent font-body text-white/90 outline-none placeholder:text-white/55"
        />
        <kbd className="mr-3 hidden shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/45 lg:inline">
          ⌘K
        </kbd>
      </div>

      {showPanel ? (
        <div
          id={panelId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[70] max-h-[min(420px,60vh)] overflow-y-auto rounded-xl border border-white/15 bg-[#1a1b3a] py-2 text-[#F0EDF8] shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Φόρτωση…
            </div>
          ) : listsError ? (
            <p className="px-4 py-6 text-sm leading-relaxed text-red-300">
              Δεν ήταν δυνατή η φόρτωση των λιστών. Έλεγξε αν ο Strapi server ανταποκρίνεται.
            </p>
          ) : !hasHits ? (
            <p className="px-4 py-6 text-sm text-white/55">Δεν βρέθηκαν αποτελέσματα.</p>
          ) : (
            <>
              {movieHits.length > 0 ? (
                <section className="px-2 pb-1">
                  <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-white/45">Ταινίες</p>
                  <ul>
                    {movieHits.map((m) => {
                      const tl = movieTitleLines(m);
                      return (
                        <li key={`movie-${m.id}`}>
                          <button
                            type="button"
                            role="option"
                            className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => runMovie(m.slug ?? "")}
                          >
                            <Clapperboard className="mt-0.5 h-5 w-5 shrink-0 text-white/45" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{tl.primary || "Τίτλος"}</span>
                              {tl.secondary ? (
                                <span className="block truncate text-xs text-white/50">{tl.secondary}</span>
                              ) : null}
                              {(m.director || m.genre) && (
                                <span className="mt-0.5 block truncate text-xs text-white/45">
                                  {[m.director, m.genre].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
              {venueHits.length > 0 ? (
                <section className="px-2">
                  <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-white/45">
                    Χώροι προβολής
                  </p>
                  <ul>
                    {venueHits.map((v) => (
                      <li key={`venue-${v.id}`}>
                        <button
                          type="button"
                          role="option"
                          className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => runVenue(v.slug ?? "")}
                        >
                          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-white/45" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{v.name || "Χώρος"}</span>
                            {v.city || v.address ? (
                              <span className="block truncate text-xs text-white/50">
                                {[v.address, v.city].filter(Boolean).join(" · ")}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
});
