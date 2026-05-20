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

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/movies", priority: "0.9", changefreq: "daily" },
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

async function fetchCollection(pluralApi) {
  const out = [];
  const pageSize = 100;
  for (let page = 1; page <= 50; page++) {
    const url = new URL(`${STRAPI_ORIGIN}/api/${pluralApi}`);
    url.searchParams.set("pagination[page]", String(page));
    url.searchParams.set("pagination[pageSize]", String(pageSize));
    url.searchParams.set("fields[0]", "slug");
    url.searchParams.set("fields[1]", "updatedAt");
    url.searchParams.set("publicationState", "live");

    const res = await fetch(url, { headers: { Accept: "application/json" } });
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

  const staticWithDates = STATIC_ROUTES.map((r) => ({
    ...r,
    lastmod: new Date().toISOString().slice(0, 10),
  }));

  const all = [...staticWithDates, ...dynamic];
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

  console.log(`[sitemap] Wrote ${all.length} URLs → public/sitemap.xml`);
  console.log(`[sitemap] ${spaSlugParams.length} SPA paths → src/generated/spa-static-paths.json`);
  console.log(`[sitemap] robots.txt → Sitemap: ${SITE_URL}/sitemap.xml`);
}

main().catch((err) => {
  console.error("[sitemap] failed:", err);
  process.exit(1);
});
