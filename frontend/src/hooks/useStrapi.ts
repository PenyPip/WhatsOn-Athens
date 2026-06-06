import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CONTENT_QUERY_OPTIONS } from "@/lib/contentQuery";
import { PROGRAM_QUERY_OPTIONS, SHOWTIMES_CALENDAR_QUERY_KEY, VENUES_PROGRAM_QUERY_KEY } from "@/lib/programQuery";
import { resolveHomepageLayout } from "@/config/home";
import { DEFAULT_SITE_NAVIGATION } from "@/config/navigation";

export const useSiteNavigation = (enabled = true) =>
  useQuery({
    queryKey: ["siteNavigation"],
    queryFn: api.getSiteNavigation,
    staleTime: 600_000,
    retry: 1,
    throwOnError: false,
    enabled,
  });

export function useSiteNavigationData(enabled = true) {
  const q = useSiteNavigation(enabled);
  return q.data ?? DEFAULT_SITE_NAVIGATION;
}

export const useHomepage = () =>
  useQuery({
    queryKey: ["homepage"],
    queryFn: api.getHomepage,
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
  });

export function useHomeLayout() {
  const homepage = useHomepage();
  return useMemo(() => resolveHomepageLayout(homepage.data ?? null), [homepage.data]);
}

export const useMovies = (enabled = true) =>
  useQuery({
    queryKey: ["movies"],
    queryFn: api.getMovies,
    ...CONTENT_QUERY_OPTIONS,
    throwOnError: false,
    retry: 1,
    enabled,
  });

export const useMovieGenres = (enabled = true) =>
  useQuery({
    queryKey: ["movieGenres"],
    queryFn: api.getMovieGenres,
    staleTime: 600_000,
    retry: 1,
    throwOnError: false,
    enabled,
  });

export const useMovieGenreCatalog = (enabled = true) =>
  useQuery({
    queryKey: ["movieGenreCatalog"],
    queryFn: api.getMovieGenreCatalog,
    staleTime: 600_000,
    retry: 1,
    throwOnError: false,
    enabled,
  });

export const useMovieBySlug = (slug: string) =>
  useQuery({
    queryKey: ["movie", slug],
    queryFn: () => api.getMovieBySlug(slug),
    ...CONTENT_QUERY_OPTIONS,
    enabled: !!slug,
  });

export const useTheaterShows = (enabled = true) =>
  useQuery({
    queryKey: ["theaterShows"],
    queryFn: api.getTheaterShows,
    ...PROGRAM_QUERY_OPTIONS,
    throwOnError: false,
    retry: 2,
    enabled,
    placeholderData: keepPreviousData,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useTheaterShowBySlug = (slug: string) =>
  useQuery({ queryKey: ["theaterShow", slug], queryFn: () => api.getTheaterShowBySlug(slug), enabled: !!slug });

export const useCuisines = (enabled = true) =>
  useQuery({
    queryKey: ["cuisines"],
    queryFn: api.getCuisines,
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
    enabled,
  });

export const useRestaurants = (enabled = true) =>
  useQuery({
    queryKey: ["restaurants"],
    queryFn: api.getRestaurants,
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
    enabled,
  });

export const useRestaurantBySlug = (slug: string) =>
  useQuery({ queryKey: ["restaurant", slug], queryFn: () => api.getRestaurantBySlug(slug), enabled: !!slug });

export const useVenues = (enabled = true) =>
  useQuery({
    queryKey: ["venues"],
    queryFn: api.getVenues,
    ...CONTENT_QUERY_OPTIONS,
    throwOnError: false,
    retry: 1,
    enabled,
  });

export const useVenuesForProgram = (enabled = true) =>
  useQuery({
    queryKey: VENUES_PROGRAM_QUERY_KEY,
    queryFn: api.getVenuesForProgram,
    ...CONTENT_QUERY_OPTIONS,
    throwOnError: false,
    retry: 1,
    enabled,
  });

export const useEditorialReviews = () =>
  useQuery({ queryKey: ["editorialReviews"], queryFn: api.getEditorialReviews, staleTime: 300_000, retry: 1, throwOnError: false });

export const useEditorialReviewBySlug = (slug: string) =>
  useQuery({ queryKey: ["editorialReview", slug], queryFn: () => api.getEditorialReviewBySlug(slug), enabled: !!slug });

export const useArticles = (enabled = true, limit = 6) =>
  useQuery({
    queryKey: ["articles", limit],
    queryFn: () => api.getArticles(limit),
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
    enabled,
  });

export const useArticleBySlug = (slug: string) =>
  useQuery({ queryKey: ["article", slug], queryFn: () => api.getArticleBySlug(slug), enabled: !!slug });

export const useArticlesForMovie = (movieSlug: string, enabled = true) =>
  useQuery({
    queryKey: ["articles", "movie", movieSlug],
    queryFn: () => api.getArticlesByMovieSlug(movieSlug),
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
    enabled: enabled && !!movieSlug,
  });

export const useArticlesForTheater = (theaterSlug: string, enabled = true) =>
  useQuery({
    queryKey: ["articles", "theater", theaterSlug],
    queryFn: () => api.getArticlesByTheaterSlug(theaterSlug),
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
    enabled: enabled && !!theaterSlug,
  });

export const useEvents = (enabled = true, limit = 6) =>
  useQuery({
    queryKey: ["events", limit],
    queryFn: () => api.getEvents(limit),
    ...CONTENT_QUERY_OPTIONS,
    retry: 1,
    throwOnError: false,
    enabled,
  });

export const useEventBySlug = (slug: string) =>
  useQuery({
    queryKey: ["event", slug],
    queryFn: () => api.getEventBySlug(slug),
    ...CONTENT_QUERY_OPTIONS,
    enabled: !!slug,
    retry: 1,
    throwOnError: false,
  });

export const useShowtimes = (enabled = true, venueSlug?: string) => {
  const scopeKey = venueSlug?.trim() ? venueSlug.trim() : SHOWTIMES_CALENDAR_QUERY_KEY[1];
  return useQuery({
    queryKey: ["showtimes", scopeKey],
    queryFn: () =>
      venueSlug?.trim() ? api.getShowtimes({ venueSlug: venueSlug.trim() }) : api.getShowtimesForHome(),
    ...PROGRAM_QUERY_OPTIONS,
    throwOnError: false,
    retry: 1,
    enabled,
  });
};

export const useUserReviews = () =>
  useQuery({ queryKey: ["userReviews"], queryFn: api.getUserReviews, staleTime: 300_000, retry: 1, throwOnError: false });
