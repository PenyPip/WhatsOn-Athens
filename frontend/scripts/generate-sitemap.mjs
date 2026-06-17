#!/usr/bin/env node
/**
 * Δημιουργεί public/sitemap.xml και public/robots.txt πριν το static export.
 * Απαιτεί προσβάσιμο Strapi (SITEMAP_STRAPI_URL ή STRAPI_INTERNAL_URL).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const generatedDir = join(__dirname, "..", "src", "generated");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://the37n.gr").replace(/\/$/, "");
const STRAPI_ORIGIN = (process.env.SITEMAP_STRAPI_URL || process.env.STRAPI_INTERNAL_URL || "http://127.0.0.1:1337").replace(
  /\/$/,
  "",
);
const SITEMAP_STRICT_MODE = process.env.SITEMAP_STRICT_MODE === "1";
const SITEMAP_STRICT_MIN_DYNAMIC = Math.max(
  0,
  parseInt(process.env.SITEMAP_STRICT_MIN_DYNAMIC || "20", 10) || 20,
);
/** Πόσες συλλογές Strapi απάντησαν επιτυχώς (για strict mode). */
let sitemapApiCollectionsOk = 0;

const MOVIES_SECTION_PATHS = ["today", "week", "summer", "new", "soon"];
const MOVIES_AREA_PATHS = ["athens", "thessaloniki", "other"];

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/movies", priority: "0.9", changefreq: "daily" },
  ...MOVIES_SECTION_PATHS.map((s) => ({
    path: `/movies/${s}`,
    priority: "0.88",
    changefreq: "daily",
  })),
  ...MOVIES_AREA_PATHS.map((a) => ({
    path: `/movies/area/${a}`,
    priority: "0.82",
    changefreq: "daily",
  })),
  { path: "/theater", priority: "0.9", changefreq: "weekly" },
  { path: "/venues", priority: "0.7", changefreq: "weekly" },
  { path: "/dining", priority: "0.6", changefreq: "weekly" },
  { path: "/reviews", priority: "0.6", changefreq: "weekly" },
  { path: "/articles", priority: "0.6", changefreq: "weekly" },
  { path: "/events", priority: "0.7", changefreq: "weekly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function entryAttrs(row) {
  if (!row || typeof row !== "object") return {};
  return row.attributes && typeof row.attributes === "object" ? row.attributes : row;
}

function pickSlug(row) {
  const a = entryAttrs(row);
  const slug = typeof a.slug === "string" ? a.slug.trim() : "";
  return slug || null;
}

function isIndexableSlug(slug) {
  if (!slug) return false;
  const s = slug.trim().toLowerCase();
  if (!s) return false;
  if (s === "venue" || s === "movie" || s === "restaurant" || s === "theater") return false;
  if (s.length < 2) return false;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s);
}

function pickLastmod(row) {
  const a = entryAttrs(row);
  const raw = a.updatedAt || a.publishedAt || a.createdAt;
  if (!raw) return null;
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function pickString(attrs, key) {
  const v = attrs[key];
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

/** Ίδια λογική με frontend theaterRunDates — run_start / run_end (ημερολόγιο). */
function theaterShowVisibleInAttrs(attrs, now = new Date()) {
  const start = pickString(attrs, "run_start").slice(0, 10);
  const end = pickString(attrs, "run_end").slice(0, 10);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ymdMs = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN;
    return new Date(y, m - 1, d).getTime();
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(start) && today < ymdMs(start)) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(end) && today > ymdMs(end)) return false;
  return true;
}

function pickDecimal(attrs, key) {
  const v = attrs[key];
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function pickEventVenue(attrs) {
  const rel = attrs?.venue;
  if (!rel) return null;
  const data = rel.data ?? rel;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const inner = row.attributes && typeof row.attributes === "object" ? row.attributes : row;
  const name = pickString(inner, "name");
  const address = pickString(inner, "address");
  if (!name && !address) return null;
  return { name, address };
}

function relationList(attrs, key) {
  const raw = attrs[key];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.data && Array.isArray(raw.data)) return raw.data;
  return [];
}

function pickNestedRelation(attrs, key) {
  const rel = attrs[key];
  if (!rel) return null;
  const data = rel.data ?? rel;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  return entryAttrs(row);
}

async function fetchHomeCalendarShowtimes() {
  try {
    const res = await fetch(`${STRAPI_ORIGIN}/api/showtimes/home-calendar`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

/** slug ταινίας → σινεμά από επερχόμενες προβολές (SEO enrichment). */
function buildMovieShowtimeHints(showtimeRows) {
  const bySlug = new Map();
  for (const row of showtimeRows) {
    const a = entryAttrs(row);
    const movie = pickNestedRelation(a, "movie");
    const venue = pickNestedRelation(a, "venue");
    const slug = pickString(movie ?? {}, "slug");
    const venueName = pickString(venue ?? {}, "name");
    if (!slug || !venueName) continue;
    let set = bySlug.get(slug);
    if (!set) {
      set = new Set();
      bySlug.set(slug, set);
    }
    set.add(venueName);
  }
  const out = new Map();
  for (const [slug, names] of bySlug) {
    const sorted = [...names].sort((x, y) => x.localeCompare(y, "el"));
    out.set(slug, {
      showtimeVenues: sorted.slice(0, 6),
      showtimeVenueCount: sorted.length,
    });
  }
  return out;
}

/** Σχετικό `/uploads/...` για og:image στο the37n.gr (όχι localhost Strapi). */
function strapiMediaUrl(media) {
  if (!media) return undefined;
  const data = media.data ?? media;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return undefined;
  const attrs = row.attributes && typeof row.attributes === "object" ? row.attributes : row;
  const url = typeof attrs.url === "string" ? attrs.url.trim() : "";
  if (!url) return undefined;
  if (url.startsWith("/uploads/")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const pathname = new URL(url).pathname;
      if (pathname.startsWith("/uploads/")) return pathname;
    } catch {
      /* ignore */
    }
    return url;
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  return path.startsWith("/uploads/") ? path : `${STRAPI_ORIGIN}${path}`;
}

const POSTER_POPULATE = "populate[poster][fields][0]=url";

/** Δεδομένα build-time για metadata, JSON-LD και SSR SEO. */
async function buildCrawlEnrichment() {
  const empty = {
    genres: [],
    venues: [],
    movies: [],
    theaterShows: [],
    restaurants: [],
    reviews: [],
    articles: [],
    culturalEvents: [],
  };

  try {
    const [genreRows, venueRows, movieRows, theaterRows, restaurantRows, reviewRows, articleRows, eventRows] =
      await Promise.all([
      fetchCollection("movie-genres", {
        extraFields: ["label", "sort_order"],
        sort: "sort_order:asc",
      }),
      fetchCollection("venues", {
        extraFields: ["name", "address", "google_maps_url", "type"],
      }),
      fetchCollection("movies", {
        extraFields: ["title", "synopsis", "original_title", "director", "imdb_rating", "critic_score"],
        populate: `${POSTER_POPULATE}&populate[movie_genres][fields][0]=slug&populate[movie_genres][fields][1]=label`,
      }),
      fetchCollection("theater-shows", {
        extraFields: ["title", "synopsis"],
        populate: POSTER_POPULATE,
      }),
      fetchCollection("restaurants", {
        extraFields: ["name"],
        populate: POSTER_POPULATE,
      }),
      fetchCollection("editorial-reviews", {
        extraFields: ["title"],
        populate: POSTER_POPULATE,
      }),
      fetchCollection("articles", {
        extraFields: ["title"],
      }),
      fetchCollection("events", {
        extraFields: [
          "title_el",
          "synopsis_el",
          "meta_description",
          "start_date",
          "end_date",
          "start_time",
          "end_time",
          "ticket_price",
          "ticket_url",
        ],
        populate: `${POSTER_POPULATE}&populate[venue][fields][0]=name&populate[venue][fields][1]=address`,
      }),
    ]);
    if (
      genreRows.length ||
      venueRows.length ||
      movieRows.length ||
      theaterRows.length ||
      restaurantRows.length ||
      reviewRows.length ||
      articleRows.length ||
      eventRows.length
    ) {
      sitemapApiCollectionsOk += 1;
    }

    const showtimeRows = await fetchHomeCalendarShowtimes();
    const showtimeHints = buildMovieShowtimeHints(showtimeRows);

    const genres = genreRows
      .map((row) => {
        const a = entryAttrs(row);
        const slug = pickSlug(row);
        if (!slug) return null;
        return {
          slug: slug.toLowerCase(),
          label: pickString(a, "label") || slug,
          href: `/movies/genre/${encodeURIComponent(slug.toLowerCase())}`,
        };
      })
      .filter(Boolean);

    const venues = venueRows
      .map((row) => {
        const a = entryAttrs(row);
        const slug = pickSlug(row);
        if (!slug) return null;
        const name = pickString(a, "name") || slug;
        const googleMapsUrl = pickString(a, "google_maps_url");
        const venueType = (pickString(a, "type") || "cinema").toLowerCase();
        const programHref =
          venueType === "theater"
            ? `/theater/venue/${encodeURIComponent(slug)}`
            : venueType === "cinema"
              ? `/movies/venue/${encodeURIComponent(slug)}`
              : undefined;
        return {
          slug,
          name,
          venueType,
          address: pickString(a, "address") || undefined,
          googleMapsUrl: googleMapsUrl || undefined,
          programHref,
          moviesHref: venueType === "cinema" ? `/movies/venue/${encodeURIComponent(slug)}` : undefined,
          theaterHref: venueType === "theater" ? programHref : undefined,
          venuesHref: "/venues",
        };
      })
      .filter(Boolean);

    const movies = movieRows
      .map((row) => {
        const a = entryAttrs(row);
        const slug = pickSlug(row);
        if (!slug) return null;
        const genreSlugs = relationList(a, "movie_genres")
          .map((g) => pickSlug(g) || pickString(entryAttrs(g), "slug"))
          .filter(Boolean)
          .map((s) => s.toLowerCase());
        const synopsis = pickString(a, "synopsis");
        const imdbRating = pickDecimal(a, "imdb_rating") ?? pickDecimal(a, "critic_score");
        const originalTitle = pickString(a, "original_title") || pickString(a, "title") || slug;
        const director = pickString(a, "director");
        const genreLine = genreSlugs
          .map((s) => genres.find((g) => g.slug === s)?.label)
          .filter(Boolean)
          .join(" · ");
        const hint = showtimeHints.get(slug);
        return {
          path: `/movies/${encodeURIComponent(slug)}`,
          slug,
          title: pickString(a, "title") || slug,
          originalTitle,
          genreSlugs: [...new Set(genreSlugs)],
          ...(genreLine ? { genreLine } : {}),
          ...(imdbRating != null ? { imdbRating } : {}),
          ...(director ? { director } : {}),
          posterUrl: strapiMediaUrl(a.poster),
          ...(synopsis ? { synopsis } : {}),
          ...(hint?.showtimeVenues?.length
            ? {
                showtimeVenues: hint.showtimeVenues,
                showtimeVenueCount: hint.showtimeVenueCount,
              }
            : {}),
        };
      })
      .filter(Boolean);

    const theaterShows = theaterRows
      .map((row) => {
        const a = entryAttrs(row);
        if (!theaterShowVisibleInAttrs(a)) return null;
        const slug = pickSlug(row);
        if (!slug) return null;
        const synopsis = pickString(a, "synopsis");
        return {
          path: `/theater/${encodeURIComponent(slug)}`,
          slug,
          title: pickString(a, "title") || slug,
          posterUrl: strapiMediaUrl(a.poster),
          ...(synopsis ? { synopsis } : {}),
        };
      })
      .filter(Boolean);

    const restaurants = restaurantRows
      .map((row) => {
        const a = entryAttrs(row);
        const slug = pickSlug(row);
        if (!slug) return null;
        return {
          path: `/dining/${encodeURIComponent(slug)}`,
          slug,
          title: pickString(a, "name") || pickString(a, "title") || slug,
          posterUrl: strapiMediaUrl(a.poster),
        };
      })
      .filter(Boolean);

    const reviews = reviewRows
      .map((row) => {
        const a = entryAttrs(row);
        const slug = pickSlug(row);
        if (!slug) return null;
        return {
          path: `/reviews/${encodeURIComponent(slug)}`,
          slug,
          title: pickString(a, "title") || slug,
          posterUrl: strapiMediaUrl(a.poster),
        };
      })
      .filter(Boolean);

    const articles = articleRows
      .map((row) => {
        const a = entryAttrs(row);
        const slug = pickSlug(row);
        if (!slug) return null;
        return {
          path: `/articles/${encodeURIComponent(slug)}`,
          slug,
          title: pickString(a, "title") || slug,
        };
      })
      .filter(Boolean);

    const culturalEvents = eventRows
      .map((row) => {
        const a = entryAttrs(row);
        const slug = pickSlug(row);
        if (!slug) return null;
        const synopsis = pickString(a, "synopsis_el");
        const metaDescription = pickString(a, "meta_description");
        const startDate = pickString(a, "start_date");
        const endDate = pickString(a, "end_date");
        const startTime = pickString(a, "start_time");
        const endTime = pickString(a, "end_time");
        const ticketPrice = pickDecimal(a, "ticket_price");
        const ticketUrl = pickString(a, "ticket_url");
        const venue = pickEventVenue(a);
        return {
          path: `/events/${encodeURIComponent(slug)}`,
          slug,
          title: pickString(a, "title_el") || slug,
          posterUrl: strapiMediaUrl(a.poster),
          ...(synopsis ? { synopsis } : {}),
          ...(metaDescription ? { metaDescription } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(startTime ? { startTime } : {}),
          ...(endTime ? { endTime } : {}),
          ...(venue?.name ? { venueName: venue.name } : {}),
          ...(venue?.address ? { venueAddress: venue.address } : {}),
          ...(ticketPrice != null ? { ticketPrice } : {}),
          ...(ticketUrl ? { ticketUrl } : {}),
        };
      })
      .filter(Boolean);

    return { genres, venues, movies, theaterShows, restaurants, reviews, articles, culturalEvents };
  } catch (err) {
    console.log(`[sitemap] crawl enrichment: skip (${err.message})`);
    return empty;
  }
}

async function fetchCollection(pluralApi, opts = {}) {
  const { extraFields = [], populate = "", sort = "" } = opts;
  const out = [];
  const pageSize = 100;
  for (let page = 1; page <= 50; page++) {
    const url = new URL(`${STRAPI_ORIGIN}/api/${pluralApi}`);
    url.searchParams.set("pagination[page]", String(page));
    url.searchParams.set("pagination[pageSize]", String(pageSize));
    url.searchParams.set("fields[0]", "slug");
    url.searchParams.set("fields[1]", "updatedAt");
    extraFields.forEach((f, i) => url.searchParams.set(`fields[${i + 2}]`, f));
    if (sort) url.searchParams.set("sort[0]", sort);
    url.searchParams.set("publicationState", "live");
    const fullUrl = populate ? `${url.toString()}&${populate}` : url.toString();

    const res = await fetch(fullUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`${pluralApi}: HTTP ${res.status}`);
    }
    const json = await res.json();
    const batch = Array.isArray(json.data) ? json.data : [];
    if (!batch.length) break;
    out.push(...batch);
    const pageCount = json.meta?.pagination?.pageCount;
    if (typeof pageCount === "number" && page >= pageCount) break;
    if (batch.length < pageSize) break;
  }
  return out;
}

async function fetchCollectionOrThrow(pluralApi, opts = {}) {
  const rows = await fetchCollection(pluralApi, opts);
  if (!rows.length) throw new Error(`${pluralApi}: empty response`);
  return rows;
}

async function slugsFromApi(pluralApi, pathPrefix) {
  try {
    const rows = await fetchCollectionOrThrow(pluralApi);
    sitemapApiCollectionsOk += 1;
    const seen = new Set();
    const urls = [];
    for (const row of rows) {
      const slug = pickSlug(row);
      if (!isIndexableSlug(slug) || seen.has(slug)) continue;
      seen.add(slug);
      urls.push({
        path: `${pathPrefix}/${encodeURIComponent(slug)}`,
        lastmod: pickLastmod(row),
        priority: "0.8",
        changefreq: "daily",
      });
    }
    console.log(`[sitemap] ${pluralApi}: ${urls.length} URLs`);
    return urls;
  } catch (err) {
    console.log(`[sitemap] ${pluralApi}: skip (${err.message})`);
    return [];
  }
}

function buildXml(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const u of urls) {
    const loc = `${SITE_URL}${u.path.startsWith("/") ? u.path : `/${u.path}`}`;
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(loc)}</loc>`);
    lines.push(`    <lastmod>${escapeXml(u.lastmod || today)}</lastmod>`);
    if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority) lines.push(`    <priority>${u.priority}</priority>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n") + "\n";
}

function buildRobots() {
  return `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /*?district=
Disallow: /*?area=
Disallow: /*?genre=
Disallow: /*?summer=
Disallow: /*?today=
Disallow: /*?week=

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

async function main() {
  const dynamic = [
    ...(await slugsFromApi("movies", "/movies")),
    ...(await slugsFromApi("theater-shows", "/theater")),
    ...(await slugsFromApi("restaurants", "/dining")),
    ...(await slugsFromApi("editorial-reviews", "/reviews")),
    ...(await slugsFromApi("articles", "/articles")),
    ...(await slugsFromApi("events", "/events")),
  ];

  const crawlEnrichmentForSitemap = await buildCrawlEnrichment();
  const venueProgramUrls = (crawlEnrichmentForSitemap.venues ?? [])
    .filter((v) => isIndexableSlug(v.slug) && v.programHref)
    .map((v) => ({
      path: v.programHref,
      lastmod: new Date().toISOString().slice(0, 10),
      priority: "0.85",
      changefreq: "daily",
    }));

  const staticWithDates = STATIC_ROUTES.map((r) => ({
    ...r,
    lastmod: new Date().toISOString().slice(0, 10),
  }));

  const genreUrls = (crawlEnrichmentForSitemap.genres ?? []).map((g) => ({
    path: g.href.startsWith("/") ? g.href : `/movies/genre/${encodeURIComponent(g.slug)}`,
    lastmod: new Date().toISOString().slice(0, 10),
    priority: "0.8",
    changefreq: "weekly",
  }));

  const all = [...staticWithDates, ...dynamic, ...venueProgramUrls, ...genreUrls];
  const criticalDynamicCount = dynamic.length + venueProgramUrls.length;
  if (SITEMAP_STRICT_MODE) {
    if (sitemapApiCollectionsOk === 0) {
      throw new Error(
        "[sitemap] strict: Strapi API unreachable — δεν δημιουργήθηκαν δυναμικές σελίδες",
      );
    }
    if (criticalDynamicCount === 0) {
      throw new Error(
        "[sitemap] strict: μηδενικές δυναμικές URLs παρά επιτυχή κλήσεις στο Strapi",
      );
    }
    if (criticalDynamicCount < SITEMAP_STRICT_MIN_DYNAMIC) {
      console.warn(
        `[sitemap] strict warning: λίγες δυναμικές URLs (${criticalDynamicCount} < ${SITEMAP_STRICT_MIN_DYNAMIC}) — συνεχίζουμε`,
      );
    }
  } else if (criticalDynamicCount < SITEMAP_STRICT_MIN_DYNAMIC) {
    console.log(
      `[sitemap] low dynamic URL count: ${criticalDynamicCount} (continuing, SITEMAP_STRICT_MODE=0)`,
    );
  }
  const xml = buildXml(all);
  const robots = buildRobots();

  writeFileSync(join(publicDir, "sitemap.xml"), xml, "utf8");
  writeFileSync(join(publicDir, "robots.txt"), robots, "utf8");

  const spaSlugParams = all
    .map((u) => u.path)
    .filter((p) => p !== "/")
    .map((path) => ({ slug: path.split("/").filter(Boolean) }));
  writeFileSync(
    join(generatedDir, "spa-static-paths.json"),
    `${JSON.stringify(spaSlugParams, null, 2)}\n`,
    "utf8",
  );

  const crawlEnrichment = crawlEnrichmentForSitemap;
  writeFileSync(
    join(generatedDir, "spa-crawl-enrichment.json"),
    `${JSON.stringify(crawlEnrichment, null, 2)}\n`,
    "utf8",
  );

  console.log(`[sitemap] Wrote ${all.length} URLs → public/sitemap.xml`);
  console.log(`[sitemap] ${spaSlugParams.length} SPA paths → src/generated/spa-static-paths.json`);
  console.log(
    `[sitemap] crawl: ${crawlEnrichment.genres.length} genres, ${crawlEnrichment.venues.length} venues, ${crawlEnrichment.movies.length} movies, ${crawlEnrichment.theaterShows?.length ?? 0} theater, ${crawlEnrichment.restaurants?.length ?? 0} dining, ${crawlEnrichment.reviews?.length ?? 0} reviews, ${crawlEnrichment.articles?.length ?? 0} articles, ${crawlEnrichment.culturalEvents?.length ?? 0} events → spa-crawl-enrichment.json`,
  );
  console.log(`[sitemap] robots.txt → Sitemap: ${SITE_URL}/sitemap.xml`);
}

main().catch((err) => {
  console.error("[sitemap] failed:", err);
  process.exit(1);
});
