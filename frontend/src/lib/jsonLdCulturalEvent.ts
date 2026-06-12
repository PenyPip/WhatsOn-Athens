import type { CrawlCulturalEvent } from "@/lib/crawlEnrichment";
import {
  buildEventLocation,
  buildEventOffers,
  buildEventOrganizer,
  eventSchemaStartEnd,
  stripEventJsonLd,
} from "@/lib/jsonLdEventUtils";
import { absolutePageUrl, resolvePublicAssetUrl, siteSeo, truncateDescription } from "@/lib/siteMetadata";

/** JSON-LD Event για /events/:slug (από crawl enrichment στο build). */
export function buildCulturalEventJsonLd(
  path: string,
  ev: CrawlCulturalEvent,
): Record<string, unknown> | null {
  const startDate = eventSchemaStartEnd(ev.startDate, ev.startTime);
  if (!startDate) return null;

  const pageUrl = absolutePageUrl(path);
  const title = ev.title?.trim() || "Event";
  const description = truncateDescription(
    ev.synopsis?.trim() ||
      ev.metaDescription?.trim() ||
      `${title} — πολιτιστική εκδήλωση · ${siteSeo.siteName}`,
  );

  const endDate = eventSchemaStartEnd(ev.endDate, ev.endTime);
  const poster = ev.posterUrl ? resolvePublicAssetUrl(ev.posterUrl) : undefined;
  const location = buildEventLocation(ev.venueName, ev.venueAddress);
  const offers = buildEventOffers(ev.ticketUrl, ev.ticketPrice, pageUrl);

  return stripEventJsonLd({
    "@type": "Event",
    "@id": `${pageUrl}#event`,
    name: title,
    url: pageUrl,
    description,
    startDate,
    ...(endDate ? { endDate } : {}),
    ...(poster ? { image: poster } : {}),
    inLanguage: "el-GR",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: buildEventOrganizer(ev.venueName),
    ...(location ? { location } : {}),
    ...(offers ? { offers } : {}),
  });
}
