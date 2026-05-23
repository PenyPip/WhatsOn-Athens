import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Clapperboard, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { useMovies, useVenues, useShowtimes } from "@/hooks/useStrapi";
import type { StrapiMovie, StrapiVenue } from "@/lib/api";
import { movieTitleLines, movieTitlesSearchBlob } from "@/lib/movieTitles";
import { enrichMoviesWithShowtimeGenre } from "@/lib/homeMovieFilters";
import { venueKindLabel } from "@/lib/venueType";
import { textMatchesSearch } from "@/lib/searchTokens";

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

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { data: movies, isLoading: moviesLoading, isError: moviesError } = useMovies();
  const { data: showtimes } = useShowtimes();
  const { data: venues, isLoading: venuesLoading, isError: venuesError } = useVenues();
  const [search, setSearch] = useState("");

  const moviesEnriched = useMemo(
    () => enrichMoviesWithShowtimeGenre(movies ?? [], showtimes ?? []),
    [movies, showtimes],
  );

  const loading = moviesLoading || venuesLoading;
  const listsError = moviesError || venuesError;

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

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

  const runMovie = useCallback(
    (slug: string) => {
      if (!slug?.trim()) return;
      onOpenChange(false);
      navigate(`/movies/${slug.trim()}`);
    },
    [navigate, onOpenChange],
  );

  const runVenue = useCallback(
    (slug: string) => {
      if (!slug?.trim()) return;
      onOpenChange(false);
      navigate(`/movies/venue/${encodeURIComponent(slug.trim())}`);
    },
    [navigate, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg sm:max-w-lg">
        <DialogTitle className="sr-only">Αναζήτηση ταινιών και χώρων</DialogTitle>
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder="Αναζήτηση ταινίας ή χώρου…"
            value={search}
            onValueChange={setSearch}
          />
          {loading ? (
            <div className="flex items-center gap-2 border-b px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Φόρτωση λιστών…
            </div>
          ) : listsError ? (
            <div className="border-b px-4 py-8 text-sm leading-relaxed text-destructive">
              Δεν ήταν δυνατή η φόρτωση των λιστών για αναζήτηση (ταινίες / χώροι). Έλεγξε αν ο server Strapi ανταποκρίνεται και αν το όνομα διακομιστή επιτρέπει τις διαδρομές API.
            </div>
          ) : (
            <CommandList className="max-h-[min(420px,60vh)]">
              <CommandEmpty>Δεν βρέθηκαν αποτελέσματα.</CommandEmpty>
              {movieHits.length > 0 ? (
                <CommandGroup heading="Ταινίες">
                  {movieHits.map((m) => {
                    const tl = movieTitleLines(m);
                    return (
                    <CommandItem
                      key={`movie-${m.id}`}
                      value={`movie-${m.id}-${m.slug ?? ""}-${tl.primary}-${tl.secondary ?? ""}`}
                      keywords={[movieTitlesSearchBlob(m), m.director ?? "", m.genre ?? "", m.slug ?? ""].filter(Boolean)}
                      onSelect={() => runMovie(m.slug ?? "")}
                      className="gap-3"
                    >
                      <Clapperboard className="shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{tl.primary || "Τίτλος"}</span>
                        {tl.secondary ? (
                          <span className="block truncate text-xs text-muted-foreground">{tl.secondary}</span>
                        ) : null}
                        {(m.director || m.genre) && (
                          <span className="block truncate text-xs text-muted-foreground mt-0.5">
                            {[m.director, m.genre].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                      <CommandShortcut className="hidden sm:inline opacity-70">Ταινία</CommandShortcut>
                    </CommandItem>
                  );})}
                </CommandGroup>
              ) : null}
              {venueHits.length > 0 ? (
                <CommandGroup heading="Χώροι προβολής">
                  {venueHits.map((v) => (
                    <CommandItem
                      key={`venue-${v.id}`}
                      value={`venue-${v.id}-${v.slug ?? ""}-${v.name ?? ""}`}
                      keywords={[v.name ?? "", v.slug ?? "", v.address ?? "", venueKindLabel(v.type), v.city ?? ""].filter(Boolean)}
                      onSelect={() => runVenue(v.slug ?? "")}
                      className="gap-3"
                    >
                      <Building2 className="shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{v.name || "Χώρος"}</span>
                        {v.city || v.address ? (
                          <span className="block truncate text-xs text-muted-foreground">{[v.address, v.city].filter(Boolean).join(" · ")}</span>
                        ) : null}
                      </span>
                      <CommandShortcut className="hidden sm:inline opacity-70">Ταινίες εδώ</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
}
