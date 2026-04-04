const STRAPI_URL = '';

async function fetchAPI(path: string, options: RequestInit = {}) {
  const url = `${STRAPI_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Strapi error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Movie {
  id: number;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  language: string;
  age_rating: string;
  synopsis: string;
  critic_score: number;
  release_date: string;
  trailer_url?: string;
  gradient_from: string;
  gradient_to: string;
  poster?: { url: string };
}

export interface TheaterShow {
  id: number;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  synopsis: string;
  tags: string[];
  gradient_from: string;
  gradient_to: string;
  poster?: { url: string };
  venue?: Venue;
}

export interface Venue {
  id: number;
  slug: string;
  name: string;
  address: string;
  city: 'athens' | 'thessaloniki' | 'other';
  google_maps_url: string;
  seats_total: number;
}

export interface Showtime {
  id: number;
  datetime: string;
  available_seats: number;
  price: number;
  venue?: Venue;
  movie?: Movie;
  theater_show?: TheaterShow;
}

export interface Review {
  id: number;
  title: string;
  body: string;
  score: number;
  author: string;
  is_editorial: boolean;
  movie?: Movie;
  theater_show?: TheaterShow;
}

export interface Booking {
  id: number;
  user_name: string;
  user_email: string;
  seat_numbers: string[];
  status: 'pending' | 'confirmed' | 'cancelled';
  qr_code?: string;
  showtime?: Showtime;
}

// ─── Movies ───────────────────────────────────────────────────────────────────

export async function getMovies(): Promise<Movie[]> {
  const data = await fetchAPI('/movies?populate=poster&sort=createdAt:desc&pagination[limit]=50&status=published');
  return data.data || [];
}

export async function getMovie(slug: string): Promise<Movie | null> {
  const data = await fetchAPI(`/movies?filters[slug][$eq]=${slug}&populate[0]=poster&populate[1]=reviews&populate[2]=showtimes&status=published`);
  return data.data?.[0] || null;
}



// ─── Theater Shows ────────────────────────────────────────────────────────────

export async function getTheaterShows(): Promise<TheaterShow[]> {
  const data = await fetchAPI('/theater-shows?populate[0]=poster&populate[1]=venue&sort=createdAt:desc&pagination[limit]=50');
  return data.data || [];
}

export async function getTheaterShow(slug: string): Promise<TheaterShow | null> {
  const data = await fetchAPI(`/theater-shows?filters[slug][$eq]=${slug}&populate[0]=poster&populate[1]=venue&populate[2]=reviews&populate[3]=showtimes`);
  return data.data?.[0] || null;
} 

// ─── Venues ───────────────────────────────────────────────────────────────────

export async function getVenues(): Promise<Venue[]> {
  const data = await fetchAPI('/venues?populate=image&sort=name:asc&status=published');
  return data.data || [];
}

export async function getVenue(slug: string): Promise<Venue | null> {
  const data = await fetchAPI(`/venues?filters[slug][$eq]=${slug}&populate=image,showtimes&status=published`);
  return data.data?.[0] || null;
}

// ─── Showtimes ────────────────────────────────────────────────────────────────

export async function getShowtimesForMovie(movieId: number): Promise<Showtime[]> {
  const data = await fetchAPI(`/showtimes?filters[movie][id][$eq]=${movieId}&populate=venue&sort=datetime:asc&status=published`);
  return data.data || [];
}

export async function getShowtimesForShow(showId: number): Promise<Showtime[]> {
  const data = await fetchAPI(`/showtimes?filters[theater_show][id][$eq]=${showId}&populate=venue&sort=datetime:asc&status=published`);
  return data.data || [];
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function getEditorialReviews(): Promise<Review[]> {
  const data = await fetchAPI('/reviews?filters[is_editorial][$eq]=true&populate=movie,theater_show&sort=createdAt:desc&pagination[limit]=6&status=published');
  return data.data || [];
}

export async function getReviewsForMovie(movieId: number): Promise<Review[]> {
  const data = await fetchAPI(`/reviews?filters[movie][id][$eq]=${movieId}&sort=createdAt:desc&status=published`);
  return data.data || [];
}

export async function getReviewsForShow(showId: number): Promise<Review[]> {
  const data = await fetchAPI(`/reviews?filters[theater_show][id][$eq]=${showId}&sort=createdAt:desc&status=published`);
  return data.data || [];
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function createBooking(data: {
  user_name: string;
  user_email: string;
  seat_numbers: string[];
  showtime_id: number;
}): Promise<Booking> {
  const qr_code = `WHATSON-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const result = await fetchAPI('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        user_name: data.user_name,
        user_email: data.user_email,
        seat_numbers: data.seat_numbers,
        status: 'confirmed',
        qr_code,
        showtime: data.showtime_id,
      },
    }),
  });
  return result.data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPosterUrl(item: Movie | TheaterShow): string | null {
  if (item.poster?.url) {
    return item.poster.url.startsWith('http')
      ? item.poster.url
      : `${STRAPI_URL}${item.poster.url}`;
  }
  return null;
}