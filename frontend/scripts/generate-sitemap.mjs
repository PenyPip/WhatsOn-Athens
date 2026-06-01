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

function pickDecimal(attrs, key) {
  const v = attrs[key];
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function relationList(attrs, key) {
  const raw = attrs[key];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.data && Array.isArray(raw.data)) return raw.data;
  return [];
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
  const empty = { genres: [], venues: [], movies: [], theaterShows: [], restaurants: [], reviews: [] };

  try {
    const [genreRows, venueRows, movieRows, theaterRows, restaurantRows, reviewRows] = await Promise.all([
      fetchCollection("movie-genres", {
        extraFields: ["label", "sort_order"],
        sort: "sort_order:asc",
      }),
      fetchCollection("venues", {
        extraFields: ["name", "address", "google_maps_url"],
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
    ]);

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
        return {
          slug,
          name,
          address: pickString(a, "address") || undefined,
          googleMapsUrl: googleMapsUrl || undefined,
          moviesHref: `/movies/venue/${encodeURIComponent(slug)}`,
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
        };
      })
      .filter(Boolean);

    const theaterShows = theaterRows
      .map((row) => {
        const a = entryAttrs(row);
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

    return { genres, venues, movies, theaterShows, restaurants, reviews };
  } catch (err) {
    console.warn(`[sitemap] crawl enrichment: skip (${err.message})`);
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

async function slugsFromApi(pluralApi, pathPrefix) {
  try {
    const rows = await fetchCollection(pluralApi);
    const seen = new Set();
    const urls = [];
    for (const row of rows) {
      const slug = pickSlug(row);
      if (!slug || seen.has(slug)) continue;
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
    console.warn(`[sitemap] ${pluralApi}: skip (${err.message})`);
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

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

async function main() {
  const dynamic = [
    ...(await slugsFromApi("movies", "/movies")),
    ...(await slugsFromApi("theater-shows", "/theater")),
    ...(await slugsFromApi("restaurants", "/dining")),
    ...(await slugsFromApi("editorial-reviews", "/reviews")),
  ];

  const crawlEnrichmentForSitemap = await buildCrawlEnrichment();
  const venueProgramUrls = (crawlEnrichmentForSitemap.venues ?? []).map((v) => ({
    path: `/movies/venue/${encodeURIComponent(v.slug)}`,
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
    `[sitemap] crawl: ${crawlEnrichment.genres.length} genres, ${crawlEnrichment.venues.length} venues, ${crawlEnrichment.movies.length} movies, ${crawlEnrichment.theaterShows?.length ?? 0} theater, ${crawlEnrichment.restaurants?.length ?? 0} dining, ${crawlEnrichment.reviews?.length ?? 0} reviews → spa-crawl-enrichment.json`,
  );
  console.log(`[sitemap] robots.txt → Sitemap: ${SITE_URL}/sitemap.xml`);
}

main().catch((err) => {
  console.error("[sitemap] failed:", err);
  process.exit(1);
});
