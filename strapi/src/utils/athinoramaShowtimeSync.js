'use strict';

const {
  getCurrentCinemaWeekBounds,
  formatWeekLabel,
  isVenueStatusCurrentWeekPhase,
  athensLocalDate,
} = require('./cinemaWeek');
const { scrapeAthinoramaHallProgram, normalizeAthinoramaHallUrl } = require('./athinoramaHallScrape');
const {
  findBestCmsMatchByPlayTitle,
  findTopCmsMatchesByPlayTitle,
  MIN_PLAY_TITLE_MATCH,
} = require('./morePlayTitleMatch');
const { createProgramTextShowtimes } = require('./programTextImport');
const {
  VENUE_UPDATED_STATUS,
  VENUE_UPDATED_LABELS,
} = require('../api/venue/services/venue-updated-status');

const MATCH_MIN = Number(process.env.PROGRAM_IMPORT_MATCH_MIN || 0.72);
const VENUE_CONCURRENCY = Math.max(
  1,
  Number(process.env.ATHINORAMA_SYNC_CONCURRENCY || 3),
);

async function mapPool(items, concurrency, fn) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, list.length)) }, async () => {
    while (next < list.length) {
      const i = next;
      next += 1;
      results[i] = await fn(list[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function findAllMovies(strapi) {
  const rows = [];
  let page = 1;
  const pageSize = 200;
  while (page <= 50) {
    const batch = await strapi.entityService.findMany('api::movie.movie', {
      fields: ['id', 'title', 'original_title', 'slug'],
      publicationState: 'preview',
      sort: { title: 'asc' },
      pagination: { page, pageSize },
    });
    const list = Array.isArray(batch) ? batch : [];
    if (!list.length) break;
    rows.push(...list);
    if (list.length < pageSize) break;
    page += 1;
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    slug: row.slug,
    contentType: 'movie',
  }));
}

/**
 * Σινεμά με Athinorama link που δεν είναι ακόμα complete για την εβδομάδα.
 */
async function findPendingAthinoramaCinemas(strapi, { includeDrafts = false } = {}) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const rows = await strapi.entityService.findMany('api::venue.venue', {
      filters: {
        type: 'cinema',
        athinorama_link: { $notNull: true },
        updated: { $ne: VENUE_UPDATED_STATUS.COMPLETE },
      },
      fields: ['id', 'name', 'slug', 'updated', 'publishedAt', 'summer_outdoor', 'athinorama_link'],
      publicationState: 'preview',
      sort: { name: 'asc' },
      pagination: { page, pageSize: 100 },
    });
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) break;
    all.push(...list);
    if (list.length < 100) break;
  }

  return all
    .filter((row) => {
      const link = normalizeAthinoramaHallUrl(row.athinorama_link);
      if (!link) return false;
      if (!includeDrafts && row.publishedAt == null) return false;
      return true;
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      updated: row.updated,
      updatedLabel: VENUE_UPDATED_LABELS[row.updated] || row.updated,
      summerOutdoor: row.summer_outdoor === true,
      athinoramaLink: normalizeAthinoramaHallUrl(row.athinorama_link),
      published: row.publishedAt != null,
    }));
}

function buildImportItemsFromScraped(scrapedMovies, cmsMovies, { summerDefault = false } = {}) {
  const items = [];
  const unmatchedTitles = [];
  let unmatchedMovies = 0;
  let matchedMovies = 0;

  for (const movie of scrapedMovies || []) {
    const title = String(movie.title || '').trim();
    if (!title) continue;
    const match = findBestCmsMatchByPlayTitle(title, cmsMovies, {
      minScore: Number.isFinite(MATCH_MIN) ? MATCH_MIN : MIN_PLAY_TITLE_MATCH,
    });
    const showtimes = (movie.showtimes || []).map((st) => ({
      datetime: st.datetime,
      note: st.note,
      summer_screening: st.summer_screening === true || summerDefault === true,
      approved: true,
    }));

    if (!match?.cmsId) {
      unmatchedMovies += 1;
      unmatchedTitles.push(title);
      items.push({
        parsedTitle: title,
        movieId: null,
        showtimes,
      });
      continue;
    }

    matchedMovies += 1;
    items.push({
      parsedTitle: title,
      movieId: match.cmsId,
      showtimes,
    });
  }

  return { items, unmatchedMovies, matchedMovies, unmatchedTitles };
}

async function syncOneVenueFromAthinorama(strapi, venue, cmsMovies, { now = new Date() } = {}) {
  const weekBounds = getCurrentCinemaWeekBounds(now);
  const link = venue.athinoramaLink || normalizeAthinoramaHallUrl(venue.athinorama_link);
  if (!link) {
    return {
      ok: false,
      venueId: venue.id,
      venueName: venue.name,
      error: 'Άκυρο Athinorama link',
    };
  }

  const scraped = await scrapeAthinoramaHallProgram(link, { weekBounds });
  if (!scraped.ok) {
    return {
      ok: false,
      venueId: venue.id,
      venueName: venue.name,
      error: scraped.error || 'Δεν βρέθηκαν προβολές στο Athinorama',
      warnings: scraped.warnings || [],
      athinoramaUrl: scraped.url || link,
      weekLabel: formatWeekLabel(weekBounds.start, weekBounds.end),
    };
  }

  const { items, unmatchedMovies, matchedMovies, unmatchedTitles } = buildImportItemsFromScraped(
    scraped.movies,
    cmsMovies,
    { summerDefault: venue.summerOutdoor === true || venue.summer_outdoor === true },
  );

  if (!items.length) {
    return {
      ok: false,
      venueId: venue.id,
      venueName: venue.name,
      error: 'Κενό πρόγραμμα μετά το parse',
      athinoramaUrl: scraped.url || link,
    };
  }

  // Πέμ–Κυρ: ενημέρωσε venue.updated. Δευ–Τετ η εβδομάδα-στόχος είναι η επόμενη —
  // το Athinorama έχει μόνο την τρέχουσα, οπότε μην μαρκάρεις complete.
  const applyVenueStatus = isVenueStatusCurrentWeekPhase(now);

  const created = await createProgramTextShowtimes(strapi, {
    venueId: venue.id,
    items,
    importMeta: { unmatchedMovies },
    now,
    weekMode: 'current',
    importTracePrefix: `Athinorama sync · ${link}`,
    applyVenueStatus,
    allowAthinoramaComplete: true,
  });

  if (!created.ok) {
    return {
      ok: false,
      venueId: venue.id,
      venueName: venue.name,
      error: created.error || 'Αποτυχία δημιουργίας προβολών',
      athinoramaUrl: scraped.url || link,
    };
  }

  return {
    ok: true,
    venueId: venue.id,
    venueName: venue.name,
    athinoramaUrl: scraped.url || link,
    weekLabel: formatWeekLabel(weekBounds.start, weekBounds.end),
    matchedMovies,
    unmatchedMovies,
    unmatchedTitles,
    created: created.summary?.created || 0,
    skippedExists: created.summary?.skippedExists || 0,
    weekExpected: created.summary?.weekExpected || 0,
    weekSynced: created.summary?.weekSynced || 0,
    weekFailed: created.summary?.weekFailed || 0,
    venueUpdated: created.venueUpdated || null,
    venueUpdatedLabel: created.venueUpdatedLabel || null,
    statusApplied: applyVenueStatus,
    warnings: scraped.warnings || [],
  };
}

/**
 * Sync ενός σινεμά από Athinorama (όταν έχει athinorama_link).
 * Επιστρέφει report συμβατό με AthinoramaSyncReportPanel / SyncReportPanel.
 */
async function syncSingleCinemaVenueFromAthinorama(strapi, options = {}) {
  const started = Date.now();
  const now = options.now instanceof Date ? options.now : new Date();
  const venueId = Number(options.venueId);
  const progress = (msg) => {
    if (typeof options.onProgress === 'function') options.onProgress(msg);
  };

  const weekBoundsEarly = getCurrentCinemaWeekBounds(now);
  const weekLabelEarly = formatWeekLabel(weekBoundsEarly.start, weekBoundsEarly.end);

  const emptyFail = (message, extra = {}) => ({
    ok: false,
    source: 'athinorama',
    at: new Date().toISOString(),
    scope: 'cinema',
    venueId,
    weekLabel: weekLabelEarly,
    pendingCount: 0,
    synced: 0,
    failed: 1,
    created: 0,
    createdTotal: 0,
    alreadyExists: 0,
    unmatchedMovies: 0,
    unmatchedTitles: [],
    becameComplete: 0,
    results: [],
    durationMs: Date.now() - started,
    message,
    ...extra,
  });

  if (!Number.isFinite(venueId) || venueId <= 0) {
    return emptyFail('Άκυρο CMS id σινεμά.');
  }

  const row = await strapi.entityService.findOne('api::venue.venue', venueId, {
    fields: ['id', 'name', 'slug', 'updated', 'publishedAt', 'summer_outdoor', 'athinorama_link', 'type'],
    publicationState: 'preview',
  });

  if (!row) {
    return emptyFail(`Δεν βρέθηκε χώρος CMS #${venueId}.`);
  }

  if (row.type && row.type !== 'cinema') {
    return emptyFail(`Ο χώρος #${venueId} «${row.name}» δεν είναι cinema (${row.type}).`);
  }

  const link = normalizeAthinoramaHallUrl(row.athinorama_link);
  if (!link) {
    return emptyFail(
      `Ο χώρος #${venueId} «${row.name}» δεν έχει έγκυρο Athinorama link (athinorama.gr/cinema/halls/…).`,
    );
  }

  const weekBounds = weekBoundsEarly;
  const weekLabel = weekLabelEarly;
  progress(`Athinorama · «${row.name}» (#${venueId}) · εβδομάδα ${weekLabel}…`);

  const cmsMovies = await findAllMovies(strapi);
  const venue = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    updated: row.updated,
    summerOutdoor: row.summer_outdoor === true,
    summer_outdoor: row.summer_outdoor === true,
    athinoramaLink: link,
    athinorama_link: link,
  };

  let result;
  try {
    result = await syncOneVenueFromAthinorama(strapi, venue, cmsMovies, { now });
    if (result?.ok && result.unmatchedTitles?.length) {
      progress(
        `${row.name}: χωρίς CMS — ${result.unmatchedTitles.slice(0, 8).join(', ')}${
          result.unmatchedTitles.length > 8 ? '…' : ''
        }.`,
      );
    }
  } catch (e) {
    result = {
      ok: false,
      venueId: row.id,
      venueName: row.name,
      error: e?.message || String(e),
    };
  }

  const ok = Boolean(result?.ok);
  const created = Number(result?.created || 0);
  const alreadyExists = Number(result?.skippedExists || 0);
  const unmatchedMovies = Number(result?.unmatchedMovies || 0);
  const unmatchedTitles = [];
  for (const title of result?.unmatchedTitles || []) {
    const suggestions = findTopCmsMatchesByPlayTitle(title, cmsMovies, {
      minScore: 0.45,
      limit: 5,
    });
    unmatchedTitles.push({
      playTitle: title,
      venues: result?.venueName ? [result.venueName] : [row.name],
      count: 1,
      kind: 'movie',
      eventIds: [],
      playIds: [],
      suggestions,
      suggestedContent: suggestions[0] || null,
    });
  }

  const becameComplete =
    ok && result?.venueUpdated?.status === VENUE_UPDATED_STATUS.COMPLETE ? 1 : 0;

  const report = {
    ok,
    source: 'athinorama',
    at: new Date().toISOString(),
    scope: 'cinema',
    venueId: row.id,
    weekLabel: result?.weekLabel || weekLabel,
    weekStart: weekBounds.start.toISOString(),
    weekEnd: weekBounds.end.toISOString(),
    currentWeekPhase: isVenueStatusCurrentWeekPhase(now),
    pendingCount: 1,
    synced: ok ? 1 : 0,
    failed: ok ? 0 : 1,
    created,
    createdTotal: created,
    alreadyExists,
    unmatchedMovies,
    unmatchedTitles,
    cmsContentChoices: [],
    weekSynced: Number(result?.weekSynced || 0),
    weekExpected: Number(result?.weekExpected || 0),
    becameComplete,
    results: [result],
    durationMs: Date.now() - started,
    athinoramaUrl: result?.athinoramaUrl || link,
  };

  report.message = ok
    ? `Athinorama «${row.name}» (#${row.id}) · ${weekLabel} · +${created} νέες · ${alreadyExists} υπήρχαν${
        unmatchedMovies ? ` · ${unmatchedMovies} χωρίς CMS` : ''
      }${becameComplete ? ' · → complete' : ''}${
        result?.venueUpdatedLabel ? ` · ${result.venueUpdatedLabel}` : ''
      }`
    : `Athinorama «${row.name}» (#${row.id}): ${result?.error || 'αποτυχία sync'}`;

  progress(report.message);
  return report;
}

/**
 * Φόρτωση τρέχουσας εβδομάδας από Athinorama για όλα τα μη complete σινεμά με link.
 * Athinorama δεν έχει μελλοντικές εβδομάδες — μόνο την τρέχουσα Πέμ→Τετ.
 */
async function syncPendingAthinoramaVenues(
  strapi,
  { now = new Date(), includeDrafts = false, onProgress } = {},
) {
  const weekBounds = getCurrentCinemaWeekBounds(now);
  const weekLabel = formatWeekLabel(weekBounds.start, weekBounds.end);
  const pending = await findPendingAthinoramaCinemas(strapi, { includeDrafts });

  const report = {
    ok: true,
    weekLabel,
    weekStart: weekBounds.start.toISOString(),
    weekEnd: weekBounds.end.toISOString(),
    currentWeekPhase: isVenueStatusCurrentWeekPhase(now),
    pendingCount: pending.length,
    synced: 0,
    failed: 0,
    createdTotal: 0,
    becameComplete: 0,
    results: [],
  };

  if (!pending.length) {
    report.message = `Κανένα εκκρεμές σινεμά με Athinorama link για ${weekLabel}.`;
    return report;
  }

  if (typeof onProgress === 'function') {
    onProgress(`Athinorama: ${pending.length} σινεμά · εβδομάδα ${weekLabel}`);
  }

  const cmsMovies = await findAllMovies(strapi);
  const results = await mapPool(pending, VENUE_CONCURRENCY, async (venue, index) => {
    if (typeof onProgress === 'function') {
      onProgress(`Athinorama ${index + 1}/${pending.length}: ${venue.name}`);
    }
    try {
      const row = await syncOneVenueFromAthinorama(strapi, venue, cmsMovies, { now });
      if (row?.ok && row.unmatchedTitles?.length && typeof onProgress === 'function') {
        onProgress(
          `${venue.name}: χωρίς CMS — ${row.unmatchedTitles.slice(0, 8).join(', ')}${
            row.unmatchedTitles.length > 8 ? '…' : ''
          }. Αντιστοίχισέ τες χειροκίνητα αν υπάρχουν.`,
        );
      }
      return row;
    } catch (e) {
      return {
        ok: false,
        venueId: venue.id,
        venueName: venue.name,
        error: e?.message || String(e),
      };
    }
  });

  report.results = results;
  let alreadyExistsTotal = 0;
  let unmatchedMoviesTotal = 0;
  let weekSyncedTotal = 0;
  let weekExpectedTotal = 0;
  const unmatchedTitleIndex = new Map();
  for (const row of results) {
    if (row?.ok) {
      report.synced += 1;
      report.createdTotal += Number(row.created || 0);
      alreadyExistsTotal += Number(row.skippedExists || 0);
      unmatchedMoviesTotal += Number(row.unmatchedMovies || 0);
      weekSyncedTotal += Number(row.weekSynced || 0);
      weekExpectedTotal += Number(row.weekExpected || 0);
      if (row.venueUpdated?.status === VENUE_UPDATED_STATUS.COMPLETE) {
        report.becameComplete += 1;
      }
      for (const title of row.unmatchedTitles || []) {
        const key = String(title).trim().toLowerCase();
        if (!key) continue;
        if (!unmatchedTitleIndex.has(key)) {
          unmatchedTitleIndex.set(key, { playTitle: title, venues: [], count: 0 });
        }
        const entry = unmatchedTitleIndex.get(key);
        entry.count += 1;
        if (row.venueName && !entry.venues.includes(row.venueName)) {
          entry.venues.push(row.venueName);
        }
      }
    } else {
      report.failed += 1;
    }
  }

  // Πεδία συμβατά με SyncReportPanel (More) — αλλιώς «Νέες εγγραφές» μένει πάντα 0.
  report.created = report.createdTotal;
  report.alreadyExists = alreadyExistsTotal;
  report.unmatchedMovies = unmatchedMoviesTotal;
  report.unmatchedTitles = [...unmatchedTitleIndex.values()].map((row) => {
    const suggestions = findTopCmsMatchesByPlayTitle(row.playTitle, cmsMovies, {
      minScore: 0.45,
      limit: 5,
    });
    return {
      ...row,
      kind: 'movie',
      eventIds: [],
      playIds: [],
      suggestions,
      suggestedContent: suggestions[0] || null,
    };
  });
  report.cmsContentChoices = [];
  report.weekSynced = weekSyncedTotal;
  report.weekExpected = weekExpectedTotal;
  report.source = 'athinorama';

  report.message = `Athinorama ${weekLabel}: ${report.synced}/${pending.length} OK · +${report.createdTotal} νέες · ${alreadyExistsTotal} υπήρχαν · ${report.becameComplete} complete${
    report.failed ? ` · ${report.failed} αποτυχίες` : ''
  }${unmatchedMoviesTotal ? ` · ${unmatchedMoviesTotal} ταινίες χωρίς CMS` : ''}`;

  return report;
}

/** Guard για cron: μόνο Πέμπτη (Europe/Athens). */
function isAthinoramaSyncThursday(now = new Date()) {
  return athensLocalDate(now).getDay() === 4;
}

module.exports = {
  findPendingAthinoramaCinemas,
  syncOneVenueFromAthinorama,
  syncSingleCinemaVenueFromAthinorama,
  syncPendingAthinoramaVenues,
  isAthinoramaSyncThursday,
};
