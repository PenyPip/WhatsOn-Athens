import type { StrapiTheaterShow } from "@/lib/api";
import { theaterGenreLabel } from "@/lib/theaterGenre";
import { absolutePageUrl, resolvePublicAssetUrl } from "@/lib/siteMetadata";

type JsonLdObject = Record<string, unknown>;

function stripUndefined(obj: JsonLdObject): JsonLdObject {
  const out: JsonLdObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const nested = stripUndefined(v as JsonLdObject);
      if (Object.keys(nested).length) out[k] = nested;
      continue;
    }
    out[k] = v;
  }
  return out;
}

function durationIsoMinutes(minutes: number): string | undefined {
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  return `PT${Math.round(minutes)}M`;
}

export type TheaterDetailJsonLdInput = {
  show: StrapiTheaterShow;
  slug: string;
  venueNames?: string[];
};

/** JSON-LD: BreadcrumbList + TheaterEvent (παράσταση). */
export function buildTheaterDetailJsonLd(input: TheaterDetailJsonLdInput): JsonLdObject {
  const { show, slug, venueNames = [] } = input;
  const pageUrl = absolutePageUrl(`/theater/${slug}`);
  const poster = resolvePublicAssetUrl(show.posterUrl);
  const synopsis = (show.synopsis ?? "").trim();

  const breadcrumbs: JsonLdObject = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Αρχική", item: absolutePageUrl("/") },
      { "@type": "ListItem", position: 2, name: "Θέατρο", item: absolutePageUrl("/theater") },
      { "@type": "ListItem", position: 3, name: show.title, item: pageUrl },
    ],
  };

  const event: JsonLdObject = {
    "@type": "TheaterEvent",
    "@id": `${pageUrl}#event`,
    name: show.title,
    url: pageUrl,
    description: synopsis || undefined,
    image: poster,
    inLanguage: "el",
    duration: durationIsoMinutes(show.duration),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: venueNames.length
      ? venueNames.map((name) => ({
          "@type": "PerformingArtsTheater",
          name: name.trim(),
        }))
      : undefined,
    director: show.director?.trim()
      ? { "@type": "Person", name: show.director.trim() }
      : undefined,
    performer: show.cast?.length
      ? show.cast.map((name) => ({ "@type": "Person", name: name.trim() })).filter((p) => (p as JsonLdObject).name)
      : undefined,
  };

  const genre = theaterGenreLabel(show.genre);
  if (genre) {
    event.genre = genre;
  }

  return {
    "@context": "https://schema.org",
    "@graph": [stripUndefined(breadcrumbs), stripUndefined(event)],
  };
}
