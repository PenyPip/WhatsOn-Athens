import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
    staleTime: 300_000,
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
    staleTime: 300_000,
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
  useQuery({ queryKey: ["movie", slug], queryFn: () => api.getMovieBySlug(slug), enabled: !!slug });

export const useTheaterShows = (enabled = true) =>
  useQuery({
    queryKey: ["theaterShows"],
    queryFn: api.getTheaterShows,
    staleTime: 300_000,
    throwOnError: false,
    retry: 1,
    enabled,
  });

export const useTheaterShowBySlug = (slug: string) =>
  useQuery({ queryKey: ["theaterShow", slug], queryFn: () => api.getTheaterShowBySlug(slug), enabled: !!slug });

export const useRestaurants = (enabled = true) =>
  useQuery({ queryKey: ["restaurants"], queryFn: api.getRestaurants, staleTime: 300_000, retry: 1, throwOnError: false, enabled });

export const useRestaurantBySlug = (slug: string) =>
  useQuery({ queryKey: ["restaurant", slug], queryFn: () => api.getRestaurantBySlug(slug), enabled: !!slug });

export const useVenues = (enabled = true) =>
  useQuery({ queryKey: ["venues"], queryFn: api.getVenues, staleTime: 300_000, throwOnError: false, retry: 1, enabled });

export const useEditorialReviews = () =>
  useQuery({ queryKey: ["editorialReviews"], queryFn: api.getEditorialReviews, staleTime: 300_000, retry: 1, throwOnError: false });

export const useEditorialReviewBySlug = (slug: string) =>
  useQuery({ queryKey: ["editorialReview", slug], queryFn: () => api.getEditorialReviewBySlug(slug), enabled: !!slug });

export const useShowtimes = (enabled = true, venueSlug?: string) =>
  useQuery({
    queryKey: ["showtimes", venueSlug ?? ""],
    queryFn: () => api.getShowtimes({ venueSlug }),
    staleTime: 300_000,
    throwOnError: false,
    retry: 1,
    enabled,
  });

export const useUserReviews = () =>
  useQuery({ queryKey: ["userReviews"], queryFn: api.getUserReviews, staleTime: 300_000, retry: 1, throwOnError: false });
