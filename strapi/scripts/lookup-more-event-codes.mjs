#!/usr/bin/env node
/**
 * CLI wrapper — ίδια λογική με το CMS (MoreLookupPage).
 *
 *   npm run lookup-more-codes
 *   npm run lookup-more-codes -- --all
 *   npm run lookup-more-codes -- --query "Scary"
 *   npm run lookup-more-codes -- --match
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  runMoreEventCodeLookup,
  fetchMoreCatalog,
  filterMoreMovies,
  verifyEventGroupCode,
  matchMoviesToMore,
} = require('../src/utils/moreEventCodeLookup.js');

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const matchCms = args.includes('--match') || (!args.includes('--all') && !queryArg());
const skipVerify = args.includes('--no-verify');
const jsonOut = args.includes('--json');

function queryArg() {
  const i = args.indexOf('--query');
  if (i === -1 || !args[i + 1]) return null;
  return args[i + 1];
}

function pad(str, len) {
  const s = String(str ?? '');
  return s.length >= len ? s.slice(0, len - 1) + '…' : s.padEnd(len);
}

async function fetchCmsMoviesHttp(strapiUrl) {
  const base = strapiUrl.replace(/\/$/, '');
  const url =
    `${base}/api/movies?` +
    'pagination[pageSize]=500&' +
    'fields[0]=title&fields[1]=original_title&fields[2]=slug&fields[3]=event_group_code&' +
    'publicationState=preview';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Strapi HTTP ${res.status} — τρέχει το Strapi στο ${base};`);
  const body = await res.json();
  const rows = Array.isArray(body?.data) ? body.data : [];
  return rows.map((row) => {
    const a = row.attributes ?? row;
    return {
      id: row.id,
      title: a.title ?? '',
      originalTitle: a.original_title ?? '',
      slug: a.slug ?? '',
      eventGroupCode: a.event_group_code ?? '',
    };
  });
}

async function main() {
  const q = queryArg();
  const strapiUrl = process.env.STRAPI_URL || 'http://localhost:1337';

  if (matchCms) {
    let cmsMovies;
    try {
      cmsMovies = await fetchCmsMoviesHttp(strapiUrl);
    } catch (e) {
      console.error(`⚠ ${e.message}`);
      process.exit(1);
    }

    const catalog = await fetchMoreCatalog();
    const movies = catalog.filter((e) => e.kind === 'movie');
    const matches = matchMoviesToMore(cmsMovies, movies);
    const verified = new Map();

    if (!skipVerify) {
      for (const row of matches) {
        if (row.more?.code && !verified.has(row.more.code)) {
          verified.set(row.more.code, await verifyEventGroupCode(row.more.code));
        }
      }
    }

    console.log('\n=== Ταύτιση CMS → More ===\n');
    console.log(
      `${pad('CMS title', 28)} | ${pad('More title', 28)} | ${pad('event_group_code', 32)} | score | API`,
    );
    console.log('-'.repeat(120));

    for (const row of matches) {
      const code = row.more?.code ?? '—';
      const v = row.more ? verified.get(row.more.code) : null;
      const api = v?.ok ? `${v.eventCount} ev / ${v.venueCount} venues` : row.more ? v?.error || '?' : '—';
      console.log(
        `${pad(row.cms.title, 28)} | ${pad(row.more?.title ?? '—', 28)} | ${pad(code, 32)} | ${(row.score || 0).toFixed(2)} | ${api}`,
      );
    }

    const matched = matches.filter((r) => r.more && r.score >= 0.68);
    console.log(`\nΣύνοψη: ${matched.length} ταύτιση, ${matches.length - matched.length} χωρίς match`);
    return;
  }

  console.log('Φόρτωση καταλόγου More.com…');
  let movies = (await fetchMoreCatalog()).filter((e) => e.kind === 'movie');
  if (q) movies = filterMoreMovies(movies, q);
  else if (!showAll) movies = movies.slice(0, 20);

  const verified = new Map();
  if (!skipVerify) {
    for (const entry of movies) {
      verified.set(entry.code, await verifyEventGroupCode(entry.code));
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify({ movies, verified: Object.fromEntries(verified) }, null, 2));
    return;
  }

  console.log(`\n=== More.com — per-movie event_group_code (${movies.length}) ===\n`);
  console.log(`${pad('Ταινία στο More', 42)} | ${pad('event_group_code', 34)} | events | venues`);
  console.log('-'.repeat(110));
  for (const e of movies) {
    const v = verified.get(e.code);
    console.log(
      `${pad(e.title, 42)} | ${pad(e.code, 34)} | ${pad(v?.ok ? v.eventCount : v?.error || '?', 6)} | ${v?.ok ? v.venueCount : '-'}`,
    );
    if (e.moreUrl) console.log(`  ${e.moreUrl}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
