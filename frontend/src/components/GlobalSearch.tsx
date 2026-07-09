import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Clapperboard, Loader2, Search, Theater } from "lucide-react";
import { useMovies, useTheaterShows, useVenues, useShowtimes } from "@/hooks/useStrapi";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useDeferUntilLcpDone } from "@/hooks/useDeferUntilLcpDone";
import type { StrapiMovie, StrapiTheaterShow, StrapiVenue } from "@/lib/api";
import { movieTitleLines, movieTitlesSearchBlob } from "@/lib/movieTitles";
import { enrichMoviesWithShowtimeGenre, showtimeIsUpcoming } from "@/lib/homeMovieFilters";
import { sortMoviesByCinemaCount } from "@/lib/movieCinemaSort";
import { sortMoviesPrioritizingFavorites } from "@/lib/favoriteSort";
import { useFavoriteIds } from "@/hooks/useFavoriteIds";
import { isPublicVenueListing, programHrefForVenue, venueKindLabel } from "@/lib/venueType";
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

function theaterShowMatches(show: StrapiTheaterShow, q: string): boolean {
  const hay = [show.title ?? "", show.slug ?? "", show.director ?? "", show.genre ?? ""].join(" ");
  return textMatchesSearch(hay, q);
}

function cmpShowTitles(a: StrapiTheaterShow, b: StrapiTheaterShow): number {
  return (a.title ?? "").localeCompare(b.title ?? "", "el");
}

const CAP_EMPTY = 10;

type PanelRect = {
  top: number;
  left: number;
  width: number;
};

function measurePanelRect(anchor: HTMLElement | null): PanelRect | null {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  const width = Math.max(rect.width, anchor.offsetWidth, anchor.clientWidth);
  if (width < 8) return null;
  return {
    top: rect.bottom + 6,
    left: rect.left,
    width,
  };
}

function eventHitsSearchUi(
  event: Event,
  root: HTMLElement | null,
  panel: HTMLElement | null,
): boolean {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  if (path.length > 0) {
    return path.some((node) => node === root || node === panel);
  }
  const target = event.target;
  if (!(target instanceof Node)) return false;
  return Boolean(root?.contains(target) || panel?.contains(target));
}

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
  const location = useLocation();
  const clientMounted = useClientMounted();
  const uid = useId();
  const inputId = `nav-search-input${uid.replace(/:/g, "")}`;
  const panelId = `nav-search-results${uid.replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const routePathRef = useRef(location.pathname);
  const layoutFrameRef = useRef<number | null>(null);
  const onHome = location.pathname === "/";
  const deferLcp = useDeferUntilLcpDone();
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);

  const searchActive = panelOpen && (!onHome || deferLcp);
  const favoriteIds = useFavoriteIds();
  const { data: movies, isLoading: moviesLoading, isError: moviesError } = useMovies(searchActive, {
    fullCatalog: false,
  });
  const { data: showtimes } = useShowtimes(searchActive);
  const { data: venues, isLoading: venuesLoading, isError: venuesError } = useVenues(searchActive);
  const {
    data: theaterShows,
    isLoading: theaterLoading,
    isError: theaterError,
  } = useTheaterShows(searchActive);

  const moviesEnriched = useMemo(() => {
    const list = movies ?? [];
    if (!searchActive || !showtimes?.length) return list;
    return enrichMoviesWithShowtimeGenre(list, showtimes);
  }, [movies, showtimes, searchActive]);

  const loading =
    searchActive &&
    movies === undefined &&
    venues === undefined &&
    theaterShows === undefined &&
    (moviesLoading || venuesLoading || theaterLoading);
  const listsError = moviesError || venuesError || theaterError;

  const close = useCallback(() => {
    setPanelOpen(false);
    setSearch("");
    setPanelRect(null);
  }, []);

  const syncPanelRect = useCallback(() => {
    const next = measurePanelRect(rootRef.current);
    if (!next) return;
    setPanelRect((prev) => {
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const schedulePanelRectSync = useCallback(() => {
    if (layoutFrameRef.current !== null) return;
    layoutFrameRef.current = window.requestAnimationFrame(() => {
      layoutFrameRef.current = null;
      syncPanelRect();
    });
  }, [syncPanelRect]);

  const openPanel = useCallback(() => {
    if (onHome && !deferLcp) return;
    setPanelOpen(true);
    schedulePanelRectSync();
  }, [deferLcp, onHome, schedulePanelRectSync]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        openPanel();
        inputRef.current?.focus({ preventScroll: true });
      },
    }),
    [openPanel],
  );

  useEffect(() => {
    if (routePathRef.current === location.pathname) return;
    routePathRef.current = location.pathname;
    setPanelOpen(false);
    setSearch("");
    setPanelRect(null);
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (!panelOpen) {
      setPanelRect(null);
      return;
    }
    syncPanelRect();
  }, [panelOpen, syncPanelRect]);

  useEffect(() => {
    if (!panelOpen) return;

    const onLayout = () => schedulePanelRectSync();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    window.visualViewport?.addEventListener("resize", onLayout);
    window.visualViewport?.addEventListener("scroll", onLayout);

    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.visualViewport?.removeEventListener("resize", onLayout);
      window.visualViewport?.removeEventListener("scroll", onLayout);
      if (layoutFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutFrameRef.current);
        layoutFrameRef.current = null;
      }
    };
  }, [panelOpen, schedulePanelRectSync]);

  useEffect(() => {
    if (!panelOpen) return;
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => schedulePanelRectSync());
    observer.observe(root);
    return () => observer.disconnect();
  }, [panelOpen, schedulePanelRectSync]);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (eventHitsSearchUi(event, rootRef.current, panelRef.current)) return;
      setPanelOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [panelOpen]);

  const movieHits = useMemo(() => {
    const list = moviesEnriched ?? [];
    const trimmed = search.trim();
    let out = trimmed
      ? sortMoviesPrioritizingFavorites(
          list.filter((m) => movieMatches(m, trimmed)),
          favoriteIds,
        )
      : sortMoviesByCinemaCount(list, showtimes ?? [], venues, (st) => showtimeIsUpcoming(st), favoriteIds);
    if (!trimmed) out = out.slice(0, CAP_EMPTY);
    return out.slice(0, 50);
  }, [moviesEnriched, search, showtimes, venues, favoriteIds]);

  const venueHits = useMemo(() => {
    const list = (venues ?? []).filter(isPublicVenueListing);
    const trimmed = search.trim();
    let out = trimmed ? list.filter((v) => venueMatches(v, trimmed)) : [...list].sort(cmpVenueNames);
    if (!trimmed) out = out.slice(0, CAP_EMPTY);
    return out.slice(0, 50);
  }, [venues, search]);

  const theaterHits = useMemo(() => {
    const list = theaterShows ?? [];
    const trimmed = search.trim();
    let out = trimmed ? list.filter((s) => theaterShowMatches(s, trimmed)) : [...list].sort(cmpShowTitles);
    if (!trimmed) out = out.slice(0, CAP_EMPTY);
    return out.slice(0, 50);
  }, [theaterShows, search]);

  const hasHits = movieHits.length > 0 || venueHits.length > 0 || theaterHits.length > 0;
  const showPanel = panelOpen;

  const runMovie = useCallback(
    (slug: string) => {
      if (!slug?.trim()) return;
      const target = `/movies/${slug.trim()}`;
      close();
      if (location.pathname !== target) navigate(target);
    },
    [close, location.pathname, navigate],
  );

  const runVenue = useCallback(
    (venue: StrapiVenue) => {
      const href = programHrefForVenue(venue);
      if (!href) return;
      close();
      if (`${location.pathname}${location.search}` !== href) navigate(href);
    },
    [close, location.pathname, location.search, navigate],
  );

  const runTheaterShow = useCallback(
    (slug: string) => {
      if (!slug?.trim()) return;
      const target = `/theater/${slug.trim()}`;
      close();
      if (location.pathname !== target) navigate(target);
    },
    [close, location.pathname, navigate],
  );

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setPanelOpen(false);
      inputRef.current?.blur();
    }
  };

  let panelBody: ReactNode;
  if (loading) {
    panelBody = (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Φόρτωση…
      </div>
    );
  } else if (listsError) {
    panelBody = (
      <p className="px-4 py-6 text-sm leading-relaxed text-red-300">
        Δεν ήταν δυνατή η φόρτωση. Δοκίμασε ξανά αργότερα.
      </p>
    );
  } else if (!hasHits) {
    panelBody = <p className="px-4 py-6 text-sm text-white/55">Δεν βρέθηκαν αποτελέσματα.</p>;
  } else {
    panelBody = (
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
                      aria-selected="false"
                      className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        runMovie(m.slug ?? "");
                      }}
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
        {theaterHits.length > 0 ? (
          <section className="px-2 pb-1">
            <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-white/45">Παραστάσεις</p>
            <ul>
              {theaterHits.map((s) => (
                <li key={`theater-${s.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      runTheaterShow(s.slug ?? "");
                    }}
                  >
                    <Theater className="mt-0.5 h-5 w-5 shrink-0 text-white/45" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.title || "Παράσταση"}</span>
                      {s.director ? (
                        <span className="mt-0.5 block truncate text-xs text-white/45">{s.director}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {venueHits.length > 0 ? (
          <section className="px-2">
            <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-white/45">Χώροι</p>
            <ul>
              {venueHits.map((v) => (
                <li key={`venue-${v.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/10"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      runVenue(v);
                    }}
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
    );
  }

  const panel =
    showPanel && clientMounted
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="listbox"
            className="fixed z-[200] max-h-[min(420px,60vh)] overflow-y-auto rounded-xl border border-white/15 bg-[#1a1b3a] py-2 text-[#F0EDF8] shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            style={
              panelRect
                ? {
                    top: panelRect.top,
                    left: panelRect.left,
                    width: panelRect.width,
                  }
                : {
                    top: 0,
                    left: 0,
                    width: 0,
                    visibility: "hidden",
                  }
            }
            onPointerDown={(event) => event.stopPropagation()}
          >
            {panelBody}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0", className)}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (!panelOpen) openPanel();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Αναζήτηση ταινίας, παράστασης ή χώρου προβολής
      </label>
      <div
        role="presentation"
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/20 bg-black/25 text-white/70 transition",
          "focus-within:border-white/35 focus-within:bg-black/35 focus-within:text-white",
          inputClassName,
        )}
        onMouseDown={(event) => {
          if (event.target === inputRef.current) return;
          event.preventDefault();
          openPanel();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <Search className="ml-3 h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={openPanel}
          onKeyDown={onInputKeyDown}
          placeholder="Ταινίες, παραστάσεις, σινεμά…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={showPanel ? panelId : undefined}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent py-0.5 font-body text-base text-white/90 outline-none placeholder:text-white/55 pr-3 md:text-sm"
        />
      </div>
      {panel}
    </div>
  );
});
