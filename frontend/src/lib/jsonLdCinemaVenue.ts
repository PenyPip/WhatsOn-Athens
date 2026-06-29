import { cinemaVenueFaqEntries, type FaqEntry } from "@/lib/cinemaVenueProgramFaq";
import { absolutePageUrl } from "@/lib/siteMetadata";

type JsonLdObject = Record<string, unknown>;

function stripUndefined(obj: JsonLdObject): JsonLdObject {
  const out: JsonLdObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export function buildFaqPageJsonLd(pageUrl: string, entries: FaqEntry[]): JsonLdObject | null {
  if (!entries.length) return null;
  return stripUndefined({
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  });
}

export function buildCinemaVenueFaqJsonLd(
  pageUrl: string,
  venueName: string,
  opts?: { hasBookingLink?: boolean; address?: string | null },
): JsonLdObject | null {
  return buildFaqPageJsonLd(pageUrl, cinemaVenueFaqEntries(venueName, opts));
}

export function cinemaVenueFaqPageUrl(path: string): string {
  return absolutePageUrl(path.startsWith("/") ? path : `/${path}`);
}
