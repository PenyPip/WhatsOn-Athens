import { absolutePageUrl, siteSeo } from "@/lib/siteMetadata";

type JsonLdObject = Record<string, unknown>;

export function stripEventJsonLd(obj: JsonLdObject): JsonLdObject {
  const out: JsonLdObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const nested = stripEventJsonLd(v as JsonLdObject);
      if (Object.keys(nested).length) out[k] = nested;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** ISO date (YYYY-MM-DD) ή dateTime με ώρα Αθήνας (+03:00). */
export function eventSchemaStartEnd(rawDate?: string, rawTime?: string): string | undefined {
  const d = rawDate?.trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return undefined;
  const t = rawTime?.trim();
  const hm = t?.match(/^(\d{2}):(\d{2})/);
  if (hm) {
    const dt = new Date(`${d}T${hm[1]}:${hm[2]}:00+03:00`);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }
  return d;
}

export function buildEventOrganizer(venueName?: string): JsonLdObject {
  const orgId = `${absolutePageUrl("/")}#organization`;
  if (venueName?.trim()) {
    return stripEventJsonLd({
      "@type": "Organization",
      name: venueName.trim(),
    });
  }
  return {
    "@type": "Organization",
    "@id": orgId,
    name: siteSeo.siteName,
    url: absolutePageUrl("/"),
  };
}

export function buildEventLocation(
  venueName?: string,
  venueAddress?: string,
): JsonLdObject | undefined {
  const name = venueName?.trim();
  const address = venueAddress?.trim();
  if (!name && !address) return undefined;

  const location: JsonLdObject = {
    "@type": "Place",
    name: name || address || "Αθήνα",
  };
  if (address) {
    location.address = {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: "Αθήνα",
      addressCountry: "GR",
    };
  }
  return location;
}

export function buildEventOffers(
  ticketUrl?: string,
  ticketPrice?: number,
  pageUrl?: string,
): JsonLdObject | undefined {
  const url = ticketUrl?.trim() || pageUrl;
  const price = ticketPrice != null && Number.isFinite(ticketPrice) && ticketPrice > 0 ? ticketPrice : undefined;
  if (!url && price == null) return undefined;

  return stripEventJsonLd({
    "@type": "Offer",
    url: url || undefined,
    price: price != null ? String(price) : undefined,
    priceCurrency: price != null ? "EUR" : undefined,
    availability: "https://schema.org/InStock",
  });
}
