import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useMovies = () =>
  useQuery({ queryKey: ["movies"], queryFn: api.getMovies });

export const useMovieBySlug = (slug: string) =>
  useQuery({ queryKey: ["movie", slug], queryFn: () => api.getMovieBySlug(slug), enabled: !!slug });

export const useTheaterShows = () =>
  useQuery({ queryKey: ["theaterShows"], queryFn: api.getTheaterShows });

export const useTheaterShowBySlug = (slug: string) =>
  useQuery({ queryKey: ["theaterShow", slug], queryFn: () => api.getTheaterShowBySlug(slug), enabled: !!slug });

export const useRestaurants = () =>
  useQuery({ queryKey: ["restaurants"], queryFn: api.getRestaurants });

export const useRestaurantBySlug = (slug: string) =>
  useQuery({ queryKey: ["restaurant", slug], queryFn: () => api.getRestaurantBySlug(slug), enabled: !!slug });

export const useVenues = () =>
  useQuery({ queryKey: ["venues"], queryFn: api.getVenues });

export const useEditorialReviews = () =>
  useQuery({ queryKey: ["editorialReviews"], queryFn: api.getEditorialReviews });

export const useEditorialReviewBySlug = (slug: string) =>
  useQuery({ queryKey: ["editorialReview", slug], queryFn: () => api.getEditorialReviewBySlug(slug), enabled: !!slug });

export const useShowtimes = () =>
  useQuery({ queryKey: ["showtimes"], queryFn: api.getShowtimes });

export const useUserReviews = () =>
  useQuery({ queryKey: ["userReviews"], queryFn: api.getUserReviews });
