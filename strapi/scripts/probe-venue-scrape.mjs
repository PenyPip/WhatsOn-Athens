#!/usr/bin/env node
/**
 * Δοκιμή HTML scrape σελίδων More (όλα τα venue URLs) — αναφορά πού δουλεύει / όχι.
 *
 *   npm run probe-venue-scrape
 *   npm run probe-venue-scrape -- --json-only
 *   STRAPI_URL=https://… npm run probe-venue-scrape
 *
 * Έξοδος: strapi/data/venue-scrape-probe.json
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { fetchMoreCatalog } = require('../src/utils/moreEventCodeLookup.js');
const { probeVenueProgramScrape, normalizeMoreUrl } = require('../src/utils/moreVenueProgramScrape.js');
const { getMoreProxyStatus } = require('../src/utils/moreHttp.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, '..', 'data', 'venue-scrape-probe.json');

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const timeoutMs = Number(process.env.MORE_VENUE_SCRAPE_PROBE_TIMEOUT_MS || 18_000);

async function fetchCmsVenueLinks(strapiUrl) {
  const base = strapiUrl.replace(/\/$/, '');
  const links = [];
  let page = 1;
  for (;;) {
    const url =
      `${base}/api/venues?` +
      `pagination[page]=${page}&pagination[pageSize]=100&` +
      'fields[0]=name&fields[1]=more_link&fields[2]=type&' +
      'publicationState=preview';
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Strapi HTTP ${res.status} (${base})`);
    const body = await res.json();
    const rows = Array.isArray(body?.data) ? body.data : [];
    for (const row of rows) {
      const a = row.attributes ?? row;
      const link = normalizeMoreUrl(a.more_link ?? a.moreLink ?? '');
      if (link) {
        links.push({
          url: link,
          title: a.name ?? `#${row.id}`,
          source: 'cms_venue',
          type: a.type ?? null,
        });
      }
    }
    const pageCount = body?.meta?.pagination?.pageCount ?? page;
    if (page >= pageCount || !rows.length) break;
    page += 1;
  }
  return links;
}

function log(...parts) {
  if (!jsonOnly) console.log(...parts);
}

async function main() {
  const strapiUrl = process.env.STRAPI_URL || 'http://localhost:1337';
  const proxy = getMoreProxyStatus();

  log('Συλλογή URLs από κατάλογο More…');
  const catalog = await fetchMoreCatalog();
  const catalogEntries = catalog
    .filter((e) => e.kind === 'venue_bundle' && e.moreUrl)
    .map((e) => ({
      url: normalizeMoreUrl(e.moreUrl),
      title: e.title || e.code,
      source: 'more_catalog',
      category: e.category,
      code: e.code,
    }));

  let cmsEntries = [];
  try {
    log(`Συλλογή more_link από CMS (${strapiUrl})…`);
    cmsEntries = await fetchCmsVenueLinks(strapiUrl);
    log(`  CMS: ${cmsEntries.length} χώροι με more_link`);
  } catch (e) {
    log(`  CMS: skip — ${e.message}`);
  }

  const byUrl = new Map();
  for (const entry of [...catalogEntries, ...cmsEntries]) {
    if (!entry.url) continue;
    if (!byUrl.has(entry.url)) byUrl.set(entry.url, entry);
  }
  const targets = [...byUrl.values()];
  const urls = targets.map((t) => t.url);

  log(`\nProbe scrape: ${urls.length} μοναδικά URLs · timeout ${timeoutMs}ms · proxy ${proxy.enabled ? proxy.host : 'off'}\n`);

  let lastPct = -1;
  const probe = await probeVenueProgramScrape(urls, {
    timeoutMs,
    delayMs: Number(process.env.MORE_VENUE_SCRAPE_PROBE_DELAY_MS || 80),
    onProgress(n, total, url) {
      const pct = Math.floor((n / total) * 100);
      if (pct !== lastPct && !jsonOnly) {
        lastPct = pct;
        process.stderr.write(`  ${n}/${total} (${pct}%)…\r`);
      }
    },
  });

  const metaByUrl = new Map(targets.map((t) => [t.url, t]));
  const entries = probe.entries.map((row) => {
    const meta = metaByUrl.get(row.url) || {};
    return {
      ...row,
      title: meta.title || null,
      source: meta.source || null,
      moreCode: meta.code || null,
      venueType: meta.type || meta.category || null,
    };
  });

  const report = {
    ...probe,
    entries,
    meta: {
      catalogVenueBundles: catalogEntries.length,
      cmsMoreLinks: cmsEntries.length,
      uniqueUrls: urls.length,
      timeoutMs,
      proxy,
      scrapeEnabledInApp: process.env.MORE_VENUE_PROGRAM_SCRAPE === 'true',
      recommendation:
        probe.summary.ok > 0
          ? 'partial_or_ok — scrape μπορεί να βοηθήσει σε ορισμένα URLs (δες entries.status=ok)'
          : 'disable — κανένα επιτυχές scrape· κράτα MORE_VENUE_PROGRAM_SCRAPE off',
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!jsonOnly) {
    console.error('');
    console.log('=== ΑΠΟΤΕΛΕΣΜΑ ===');
    console.log('Warmup:', probe.warmup.ok ? 'OK' : `ΑΠΟΤΥΧΙΑ — ${probe.warmup.error}`);
    console.log('Summary:', probe.summary);
    console.log('Αρχείο:', OUT_FILE);
    if (probe.summary.ok > 0) {
      console.log('\nΕπιτυχημένα URLs:');
      for (const row of entries.filter((e) => e.status === 'ok')) {
        console.log(`  ✓ ${row.title || row.url} (${row.playCount} τίτλοι, ${row.eventCount} events)`);
      }
    }
    const failed = entries.filter((e) => e.status !== 'ok');
    if (failed.length) {
      console.log(`\nΑποτυχημένα / κενά: ${failed.length}`);
      const byStatus = {};
      for (const row of failed) {
        byStatus[row.status] = (byStatus[row.status] || 0) + 1;
      }
      console.log('  ανά status:', byStatus);
    }
    console.log(`\nΣύσταση: ${report.meta.recommendation}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
