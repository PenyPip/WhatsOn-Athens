import { authFetch } from "@/lib/auth";

export type ProfileMovie = {
  id: number;
  slug: string;
  title: string;
  originalTitle: string;
  isDubbed: boolean;
  imdbRating: number | null;
  posterUrl: string | null;
  genres: { slug: string; label: string }[];
};

export type ProfileVenue = {
  id: number;
  slug: string;
  name: string;
  summerOutdoor: boolean;
  venueType: string | null;
  city: string | null;
};

export type ProfileTheaterShow = {
  id: number;
  slug: string;
  title: string;
  posterUrl: string | null;
};

export type UserProfile = {
  id: number;
  displayName: string | null;
  favoriteMovies: ProfileMovie[];
  favoriteVenues: ProfileVenue[];
  seenMovies: ProfileMovie[];
  seenTheaterShows: ProfileTheaterShow[];
  user?: {
    id: number;
    username: string;
    email: string;
  };
};

export type PopularityStats = {
  platformUsers: number;
  platformReady: boolean;
  interestedCount: number;
  isPopular: boolean;
  reviewCount: number;
  avgRating: number | null;
};

export type UserReviewMine = {
  id: number;
  userName: string;
  rating: number;
  body: string;
  contentType: string;
  contentTitle: string;
  movieId: number | null;
  theaterShowId: number | null;
  restaurantId: number | null;
  createdAt: string;
};

export async function fetchMyProfile() {
  return authFetch<UserProfile>("/user-profiles/me");
}

export async function toggleFavoriteMovie(movieId: number) {
  return authFetch<{ active: boolean; profile: UserProfile }>(
    `/user-profiles/me/favorite-movies/${movieId}`,
    { method: "POST", body: "{}" },
  );
}

export async function toggleFavoriteVenue(venueId: number) {
  return authFetch<{ active: boolean; profile: UserProfile }>(
    `/user-profiles/me/favorite-venues/${venueId}`,
    { method: "POST", body: "{}" },
  );
}

export async function toggleSeenMovie(movieId: number) {
  return authFetch<{ active: boolean; profile: UserProfile }>(
    `/user-profiles/me/seen-movies/${movieId}`,
    { method: "POST", body: "{}" },
  );
}

export async function toggleSeenTheaterShow(theaterShowId: number) {
  return authFetch<{ active: boolean; profile: UserProfile }>(
    `/user-profiles/me/seen-theater-shows/${theaterShowId}`,
    { method: "POST", body: "{}" },
  );
}

export async function fetchMoviePopularity(movieId: number) {
  return authFetch<PopularityStats>(`/user-profiles/popularity/movie/${movieId}`);
}

export async function fetchMyReviews() {
  return authFetch<UserReviewMine[]>("/user-reviews/me");
}

export async function createMyReview(input: {
  contentType: "movie" | "theater" | "restaurant";
  rating: number;
  body: string;
  movieId?: number;
  theaterShowId?: number;
  restaurantId?: number;
}) {
  return authFetch<UserReviewMine>("/user-reviews/me", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteMyReview(reviewId: number) {
  return authFetch<{ id: number; deleted: boolean }>(`/user-reviews/me/${reviewId}`, {
    method: "DELETE",
  });
}
