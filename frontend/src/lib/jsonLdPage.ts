import { crawlSeoCopyForPath } from "@/lib/crawlEnrichment";
import { absolutePageUrl, resolvePublicAssetUrl, siteSeo, truncateDescription } from "@/lib/siteMetadata";
import { staticPageSeo } from "@/lib/pageSeoCopy";

type JsonLdNode = Record<string, unknown>;

function stripEmpty(obj: JsonLdNode): JsonLdNode {
  const out: JsonLdNode = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const n = stripEmpty(v as JsonLdNode);
      if (Object.keys(n).length) out[k] = n;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** Διαδρομή από Next `slug` param. */
export function pathFromSlugParam(slug?: string[]): string {
  if (!slug?.length) return "/";
  return `/${slug.join("/")}`;
}

/** Ανθρώπινο όνομα από slug (crawl / schema όταν λείπει API στο HTML). */
export function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

const SECTION_LABELS: Record<string, string> = {
  movies: staticPageSeo.movies.title,
  theater: staticPageSeo.theater.title,
  venues: staticPageSeo.venues.title,
  dining: staticPageSeo.dining.title,
  reviews: staticPageSeo.reviews.title,
  privacy: staticPageSeo.privacy.title,
};

/** Τίτλος/περιγραφή για server metadata & WebPage name. */
export function seoCopyForPath(path: string): { title: string; description: string } {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const fromCrawl = crawlSeoCopyForPath(normalized);
  if (fromCrawl) return fromCrawl;

  const staticByPath: Record<string, (typeof staticPageSeo)[keyof typeof staticPageSeo]> = {
    "/": staticPageSeo.home,
    "/movies": staticPageSeo.movies,
    "/theater": staticPageSeo.theater,
    "/venues": staticPageSeo.venues,
    "/dining": staticPageSeo.dining,
    "/reviews": staticPageSeo.reviews,
    "/privacy": staticPageSeo.privacy,
  };
  if (staticByPath[normalized]) {
    const s = staticByPath[normalized];
    return { title: s.title, description: s.description };
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const section = parts[0];
    const slug = parts[1];
    const name = slugToDisplayName(slug);
    const sectionLabel = SECTION_LABELS[section] ?? section;
    if (section === "movies") {
      return {
        title: name,
        description: truncateDescription(`Προβολές, ώρες και σινεμά για ${name} — ${siteSeo.siteName}.`),
      };
    }
    if (section === "theater") {
      return {
        title: name,
        description: truncateDescription(`Παράσταση ${name} — χώρος, είδος και πληροφορίες θεάτρου.`),
      };
    }
    if (section === "dining") {
      return {
        title: name,
        description: truncateDescription(`${name} — εστιατόριο, κουζίνα και τοποθεσία στην Αθήνα.`),
      };
    }
    if (section === "reviews") {
      return {
        title: name,
        description: truncateDescription(`Κριτική: ${name} — ${siteSeo.siteName}.`),
      };
    }
    return {
      title: name,
      description: truncateDescription(`${name} — ${sectionLabel} στο ${siteSeo.siteName}.`),
    };
  }

  return { title: siteSeo.siteName, description: siteSeo.description };
}

function breadcrumbList(path: string, pageName: string): JsonLdNode {
  const homeUrl = absolutePageUrl("/");
  const pageUrl = absolutePageUrl(path);
  const items: JsonLdNode[] = [
    { "@type": "ListItem", position: 1, name: "Αρχική", item: homeUrl },
  ];

  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) {
    items.push({ "@type": "ListItem", position: 2, name: pageName, item: pageUrl });
  } else if (parts.length === 1) {
    const section = parts[0];
    items.push({
      "@type": "ListItem",
      position: 2,
      name: SECTION_LABELS[section] ?? slugToDisplayName(section),
      item: absolutePageUrl(`/${section}`),
    });
  } else {
    const section = parts[0];
    const sectionLabel = SECTION_LABELS[section] ?? slugToDisplayName(section);
    items.push({
      "@type": "ListItem",
      position: 2,
      name: sectionLabel,
      item: absolutePageUrl(`/${section}`),
    });
    items.push({ "@type": "ListItem", position: 3, name: pageName, item: pageUrl });
  }

  return stripEmpty({
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items,
  });
}

function entityNodeForPath(path: string, pageName: string, pageUrl: string): JsonLdNode | JsonLdNode[] | null {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "movies" && parts.length >= 2) {
    return [
      stripEmpty({
        "@type": "Movie",
        "@id": `${pageUrl}#movie`,
        name: pageName,
        url: pageUrl,
        inLanguage: "el",
      }),
      stripEmpty({
        "@type": "Product",
        "@id": `${pageUrl}#product`,
        name: `${pageName} — προβολή σινεμά`,
        url: pageUrl,
        category: "Movie ticket",
        offers: {
          "@type": "Offer",
          url: `${pageUrl}#showtimes`,
          availability: "https://schema.org/InStock",
          priceCurrency: "EUR",
        },
      }),
    ];
  }
  if (parts[0] === "theater" && parts.length >= 2) {
    return stripEmpty({
      "@type": "TheaterEvent",
      "@id": `${pageUrl}#event`,
      name: pageName,
      url: pageUrl,
      inLanguage: "el",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
    });
  }
  if (parts[0] === "dining" && parts.length >= 2) {
    return stripEmpty({
      "@type": "Restaurant",
      "@id": `${pageUrl}#restaurant`,
      name: pageName,
      url: pageUrl,
    });
  }
  if (parts[0] === "reviews" && parts.length >= 2) {
    const authorPerson = stripEmpty({
      "@type": "Person",
      "@id": `${pageUrl}#author`,
      name: `${siteSeo.siteName} — Συντακτική ομάδα`,
      worksFor: { "@id": `${absolutePageUrl("/")}#organization` },
    });
    return [
      authorPerson,
      stripEmpty({
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: pageName,
        name: pageName,
        url: pageUrl,
        inLanguage: "el-GR",
        author: { "@id": `${pageUrl}#author` },
        publisher: { "@id": `${absolutePageUrl("/")}#organization` },
        mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      }),
    ];
  }
  if (path === "/privacy") {
    return stripEmpty({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Τι δεδομένα συλλέγει το 37Ν;",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Χρησιμοποιούμε cookies και δεδομένα χρήσης σύμφωνα με την πολιτική απορρήτου για λειτουργία του site και στατιστικά.",
          },
        },
        {
          "@type": "Question",
          name: "Πώς διαχειρίζομαι τα cookies;",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Μπορείς να διαβάσεις την πολιτική cookies στη σελίδα απορρήτου και να ρυθμίσεις τις προτιμήσεις σου από εκεί.",
          },
        },
        {
          "@type": "Question",
          name: "Πού βρίσκω τους όρους χρήσης;",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Οι όροι χρήσης είναι διαθέσιμοι στην ίδια σελίδα, στην ενότητα όρων.",
          },
        },
      ],
    });
  }
  return null;
}

/**
 * Πλήρες JSON-LD graph για αρχικό HTML (crawlers χωρίς JS).
 * Organization, WebSite, WebPage, BreadcrumbList + entity ανά path.
 */
export function buildPageJsonLd(path: string): JsonLdNode {
  const normalized = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const { title, description } = seoCopyForPath(normalized);
  const pageUrl = absolutePageUrl(normalized);
  const homeUrl = absolutePageUrl("/");
  const orgId = `${homeUrl}#organization`;
  const websiteId = `${homeUrl}#website`;
  const logo = resolvePublicAssetUrl(siteSeo.ogImagePath);

  const graph: JsonLdNode[] = [
    stripEmpty({
      "@type": "Organization",
      "@id": orgId,
      name: siteSeo.siteName,
      url: homeUrl,
      logo: logo ? { "@type": "ImageObject", url: logo } : undefined,
      description: siteSeo.description,
    }),
    stripEmpty({
      "@type": "WebSite",
      "@id": websiteId,
      name: siteSeo.siteName,
      url: homeUrl,
      description: siteSeo.description,
      inLanguage: "el-GR",
      publisher: { "@id": orgId },
    }),
    stripEmpty({
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      inLanguage: "el-GR",
      isPartOf: { "@id": websiteId },
      about: { "@id": orgId },
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    }),
    breadcrumbList(normalized, title),
  ];

  const entity = entityNodeForPath(normalized, title, pageUrl);
  if (entity) {
    if (Array.isArray(entity)) graph.push(...entity);
    else graph.push(entity);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
