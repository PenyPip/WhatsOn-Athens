import type { StrapiMovie, StrapiShowtime, StrapiVenue } from "@/lib/api";
import { absolutePageUrl, resolvePublicAssetUrl } from "@/lib/siteMetadata";
import { movieTitleLines } from "@/lib/movieTitles";
import { findVenueForShowtime, isValidExternalUrl } from "@/lib/venueResolve";

type JsonLdObject = Record<string, unknown>;

function stripUndefined(obj: JsonLdObject): JsonLdObject {
  const out: JsonLdObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      const arr = v.map((item) =>
        typeof item === "object" && item !== null && !Array.isArray(item)
          ? stripUndefined(item as JsonLdObject)
          : item,
      ).filter((item) => item !== undefined && item !== null && item !== "");
      if (arr.length) out[k] = arr;
      continue;
    }
    if (typeof v === "object") {
      const nested = stripUndefined(v as JsonLdObject);
      if (Object.keys(nested).length) out[k] = nested;
      continue;
    }
    out[k] = v;
  }
  return out;
}

function isoDateTime(raw: string): string | undefined {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function durationIsoMinutes(minutes: number): string | undefined {
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  return `PT${Math.round(minutes)}M`;
}

function screeningEvent(
  st: StrapiShowtime,
  movie: StrapiMovie,
  movieUrl: string,
  venues: StrapiVenue[] | undefined,
): JsonLdObject | null {
  const startDate = isoDateTime(st.datetime);
  if (!startDate) return null;

  const venueRecord = findVenueForShowtime(venues, st);
  const venueName = venueRecord?.name?.trim() || (st.venue ?? "").trim() || "Σινεμά";
  const tl = movieTitleLines(movie);
  const mapsUrl = isValidExternalUrl(venueRecord?.googleMapsUrl) ? venueRecord!.googleMapsUrl.trim() : undefined;

  const location: JsonLdObject = {
    "@type": "MovieTheater",
    name: venueName,
    url: mapsUrl,
  };
  if (venueRecord?.address?.trim()) {
    location.address = {
      "@type": "PostalAddress",
      streetAddress: venueRecord.address.trim(),
    };
  }

  const event: JsonLdObject = {
    "@type": "ScreeningEvent",
    name: `${tl.primary} — ${venueName}`,
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location,
    workPresented: {
      "@type": "Movie",
      name: tl.primary,
      url: movieUrl,
    },
  };

  if (st.hallName?.trim()) {
    (event.location as JsonLdObject).containsPlace = {
      "@type": "Place",
      name: st.hallName.trim(),
    };
  }

  if (st.price != null && Number.isFinite(st.price)) {
    event.offers = {
      "@type": "Offer",
      price: Number.isInteger(st.price) ? String(st.price) : st.price.toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${movieUrl}#showtimes`,
    };
  }

  return stripUndefined(event);
}

export type MovieDetailJsonLdInput = {
  movie: StrapiMovie;
  slug: string;
  genreLabel: string;
  showtimes: StrapiShowtime[];
  venues?: StrapiVenue[];
};

/** JSON-LD @graph: BreadcrumbList, Movie, ScreeningEvent ανά προβολή. */
export function buildMovieDetailJsonLd(input: MovieDetailJsonLdInput): JsonLdObject {
  const { movie, slug, genreLabel, showtimes, venues } = input;
  const tl = movieTitleLines(movie);
  const movieUrl = absolutePageUrl(`/movies/${slug}`);
  const poster = resolvePublicAssetUrl(movie.posterUrl);
  const synopsis = (movie.synopsis ?? "").trim();

  const movieEntity: JsonLdObject = {
    "@type": "Movie",
    "@id": `${movieUrl}#movie`,
    name: tl.primary,
    url: movieUrl,
    description: synopsis || undefined,
    image: poster,
    inLanguage: movie.language?.trim() || (movie.isDubbed ? "el" : undefined),
    director: movie.director?.trim()
      ? { "@type": "Person", name: movie.director.trim() }
      : undefined,
    actor: movie.cast?.length
      ? movie.cast.map((name) => ({ "@type": "Person", name: name.trim() })).filter((a) => (a as JsonLdObject).name)
      : undefined,
    duration: durationIsoMinutes(movie.duration),
    datePublished: movie.releaseDate?.trim() ? `${movie.releaseDate.trim()}T12:00:00+02:00` : undefined,
  };

  if (genreLabel.trim()) {
    const parts = genreLabel.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
    movieEntity.genre = parts.length === 1 ? parts[0] : parts;
  }

  const critic = Number(movie.criticScore);
  if (Number.isFinite(critic) && critic > 0) {
    movieEntity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: critic,
      bestRating: 10,
      worstRating: 0,
    };
  }

  const breadcrumbs: JsonLdObject = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Αρχική",
        item: absolutePageUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Ταινίες",
        item: absolutePageUrl("/movies"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: tl.primary,
        item: movieUrl,
      },
    ],
  };

  const screenings = showtimes
    .map((st) => screeningEvent(st, movie, movieUrl, venues))
    .filter((e): e is JsonLdObject => e !== null);

  const graph: JsonLdObject[] = [
    stripUndefined(breadcrumbs),
    stripUndefined(movieEntity),
    ...screenings,
  ];

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
