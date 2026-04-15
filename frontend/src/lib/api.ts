const API_URL = import.meta.env.VITE_API_URL || "/api";

async function fetchAPI<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const base = window.location.protocol + '//' + window.location.hostname;
  const url = new URL(`/api${endpoint}`, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  url.searchParams.set("populate", "*");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data ?? json;
}

function mapMovie(m: any): StrapiMovie {
  return {
    id: m.id,
    documentId: m.documentId,
    slug: m.slug,
    title: m.title,
    director: m.director,
    cast: m.cast || [],
    genre: m.genre,
    duration: m.duration,
    language: m.language,
    ageRating: m.age_rating,
    synopsis: m.synopsis,
    criticScore: m.critic_score,
    releaseDate: m.release_date,
    trailerUrl: m.trailer_url,
    posterUrl: m.poster?.url 
  ? m.poster.url.replace('http://localhost:1337', '').replace('http://strapi:1337', '')
  : m.poster_url 
    ? m.poster_url.replace('http://localhost:1337', '').replace('http://strapi:1337', '')
    : null,
    gradientFrom: m.gradient_from || "#1a1a2e",
    gradientTo: m.gradient_to || "#e94560",
  };
}

function mapTheaterShow(s: any): StrapiTheaterShow {
  return {
    id: s.id,
    documentId: s.documentId,
    slug: s.slug,
    title: s.title,
    director: s.director,
    cast: s.cast || [],
    genre: s.genre,
    duration: s.duration,
    venue: s.venue?.name || s.venue || "",
    synopsis: s.synopsis,
    tags: s.tags || [],
    posterUrl: s.poster?.url 
  ? s.poster.url.replace('http://localhost:1337', '').replace('http://strapi:1337', '')
  : null,
    gradientFrom: s.gradient_from || "#2c3e50",
    gradientTo: s.gradient_to || "#8e44ad",
    isPremiere: s.is_premiere,
    isLastShows: s.is_last_shows,
  };
}

function mapRestaurant(r: any): StrapiRestaurant {
  return {
    id: r.id,
    documentId: r.documentId,
    slug: r.slug,
    name: r.name,
    synopsis: r.synopsis,
    cuisine: r.cuisine,
    neighborhood: r.neighborhood,
    city: r.city,
    priceRange: r.price_range,
    address: r.address,
    phone: r.phone,
    website: r.website,
    instagram: r.instagram,
    openingDate: r.opening_date,
    isNew: r.is_new,
    posterUrl: r.poster?.url 
  ? r.poster.url.replace('http://localhost:1337', '').replace('http://strapi:1337', '')
  : null,
    gradientFrom: r.gradient_from || "#1a1a2e",
    gradientTo: r.gradient_to || "#e8a020",
    editorialScore: r.editorial_score,
    editorialReview: r.editorial_review,
    editorialAuthor: r.editorial_author,
  };
}

function mapEditorialReview(r: any): StrapiEditorialReview {
  return {
    id: r.id,
    documentId: r.documentId,
    slug: r.slug,
    title: r.title,
    body: r.body,
    score: r.score,
    author: r.author,
    authorImageUrl: r.author_image_url,
    category: r.category,
    contentTitle: r.movie?.title || r.theater_show?.title || r.restaurant?.name || "",
    featuredImageGradientFrom: r.featured_image_gradient_from,
    featuredImageGradientTo: r.featured_image_gradient_to,
    publishedAt: r.publishedAt,
  };
}

function mapShowtime(s: any): StrapiShowtime {
  return {
    id: s.id,
    documentId: s.documentId,
    datetime: s.datetime,
    venue: s.venue?.name || s.venue || "",
    availableSeats: s.available_seats,
    price: s.price,
  };
}

function mapUserReview(r: any): StrapiUserReview {
  return {
    id: r.id,
    documentId: r.documentId,
    userName: r.user_name,
    rating: r.rating,
    body: r.body,
    contentType: r.content_type,
    contentTitle: r.content_title || "",
    createdAt: r.createdAt,
  };
}

function mapVenue(v: any): StrapiVenue {
  return {
    id: v.id,
    documentId: v.documentId,
    slug: v.slug,
    name: v.name,
    address: v.address,
    city: v.city,
    googleMapsUrl: v.google_maps_url,
    seatsTotal: v.seats_total,
    type: v.type || "",
  };
}

export interface StrapiMovie {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  language: string;
  ageRating: string;
  synopsis: string;
  criticScore: number;
  releaseDate: string;
  trailerUrl?: string;
  posterUrl?: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface StrapiTheaterShow {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  director: string;
  cast: string[];
  genre: string;
  duration: number;
  venue: string;
  synopsis: string;
  tags: string[];
  posterUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  isPremiere?: boolean;
  isLastShows?: boolean;
}

export interface StrapiRestaurant {
  id: number;
  documentId: string;
  slug: string;
  name: string;
  synopsis: string;
  cuisine: string;
  neighborhood: string;
  city: string;
  priceRange: string;
  address: string;
  phone?: string;
  website?: string;
  instagram?: string;
  openingDate: string;
  isNew: boolean;
  posterUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  editorialScore?: number;
  editorialReview?: string;
  editorialAuthor?: string;
}

export interface StrapiVenue {
  id: number;
  documentId: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  googleMapsUrl: string;
  seatsTotal: number;
  type: string;
}

export interface StrapiEditorialReview {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  body: string;
  score?: number;
  author: string;
  authorImageUrl?: string;
  category: "movie" | "theater" | "restaurant";
  contentTitle: string;
  featuredImageGradientFrom?: string;
  featuredImageGradientTo?: string;
  publishedAt: string;
}

export interface StrapiShowtime {
  id: number;
  documentId: string;
  datetime: string;
  venue: string;
  availableSeats: number;
  price: number;
}

export interface StrapiUserReview {
  id: number;
  documentId: string;
  userName: string;
  rating: number;
  body: string;
  contentType: string;
  contentTitle: string;
  createdAt: string;
}

export const api = {
  getMovies: () => fetchAPI<any[]>("/movies").then((d) => d.map(mapMovie)),
  getMovieBySlug: (slug: string) => fetchAPI<any[]>(`/movies`, { "filters[slug][$eq]": slug }).then((d) => d[0] ? mapMovie(d[0]) : undefined),

  getTheaterShows: () => fetchAPI<any[]>("/theater-shows").then((d) => d.map(mapTheaterShow)),
  getTheaterShowBySlug: (slug: string) => fetchAPI<any[]>(`/theater-shows`, { "filters[slug][$eq]": slug }).then((d) => d[0] ? mapTheaterShow(d[0]) : undefined),

  getRestaurants: () => fetchAPI<any[]>("/restaurants").then((d) => d.map(mapRestaurant)),
  getRestaurantBySlug: (slug: string) => fetchAPI<any[]>(`/restaurants`, { "filters[slug][$eq]": slug }).then((d) => d[0] ? mapRestaurant(d[0]) : undefined),

  getVenues: () => fetchAPI<any[]>("/venues").then((d) => d.map(mapVenue)),

  getEditorialReviews: () => fetchAPI<any[]>("/editorial-reviews").then((d) => d.map(mapEditorialReview)),
  getEditorialReviewBySlug: (slug: string) => fetchAPI<any[]>(`/editorial-reviews`, { "filters[slug][$eq]": slug }).then((d) => d[0] ? mapEditorialReview(d[0]) : undefined),

  getShowtimes: () => fetchAPI<any[]>("/showtimes").then((d) => d.map(mapShowtime)),

  getUserReviews: () => fetchAPI<any[]>("/user-reviews").then((d) => d.map(mapUserReview)),
};