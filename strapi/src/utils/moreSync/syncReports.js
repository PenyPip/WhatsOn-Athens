'use strict';

const { mergeUnmatchedTitleLists } = require('./unmatchedReport');

const REPORT_DETAIL_MAX = Number(process.env.MORE_SHOWTIME_SYNC_REPORT_DETAIL_MAX || 80);

function compactSyncErrorMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  const dataTooLong = s.match(/Data too long for column '([^']+)'/i);
  if (dataTooLong) {
    return `Πολύ μεγάλη τιμή για το πεδίο «${dataTooLong[1]}»`;
  }
  if (/Duplicate entry/i.test(s)) {
    return 'Διπλότυπη εγγραφή (unique constraint)';
  }

  const parts = s.split(' - ');
  const tail = parts[parts.length - 1]?.trim() || '';
  if (tail && tail.length < 240 && !/^insert into/i.test(tail)) {
    if (tail !== s) return compactSyncErrorMessage(tail);
    return tail;
  }

  if (/^insert into/i.test(s) && s.length > 120) {
    return compactSyncErrorMessage(tail) || 'Σφάλμα εγγραφής στη βάση';
  }

  return s.length > 240 ? `${s.slice(0, 237)}…` : s;
}

function pushSyncError(report, dedup, entry) {
  if (!Array.isArray(report.errors)) report.errors = [];
  const msg = compactSyncErrorMessage(entry.error || entry.message || '');
  const key = [
    entry.action,
    entry.venueType,
    entry.name || entry.title,
    entry.moreVenueId,
    entry.movieId,
    entry.theaterShowId,
    entry.venueId,
    entry.code,
    msg,
  ]
    .filter((v) => v != null && v !== '')
    .join('|');
  if (dedup.has(key)) return;
  dedup.add(key);
  report.errors.push({ ...entry, error: msg });
}

function mergeMovieSyncReports(target, source) {
  if (!source) return target;
  if (!target) return { ...source };
  const counterKeys = [
    'createdFromMovies',
    'createdFromVenues',
    'createdCinemaVenues',
    'alreadyExists',
    'dedupedSummerShowtimes',
    'skippedPast',
    'skippedNoVenue',
    'skippedUnknownEventId',
    'skippedInvalidDate',
    'resolvedViaVenueScrape',
    'scrapeTitleUnmatched',
  ];
  target.moviesScanned = (target.moviesScanned || 0) + (source.moviesScanned || 0);
  for (const key of counterKeys) {
    target[key] = (target[key] || 0) + (source[key] || 0);
  }
  target.createdCinemaVenuesList = [
    ...(target.createdCinemaVenuesList || []),
    ...(source.createdCinemaVenuesList || []),
  ];
  target.byMovie = [...(target.byMovie || []), ...(source.byMovie || [])];
  target.byVenue = [...(target.byVenue || []), ...(source.byVenue || [])];
  target.missingVenueIds = [...(target.missingVenueIds || []), ...(source.missingVenueIds || [])];
  target.errors = [...(target.errors || []), ...(source.errors || [])];
  target.scrapeTitleMisses = mergeUnmatchedTitleLists(
    target.scrapeTitleMisses,
    source.scrapeTitleMisses,
  ).scrapeTitleMisses;
  if (source.cmsContentChoices?.length) {
    const seen = new Set((target.cmsContentChoices || []).map((c) => `${c.contentType}:${c.id}`));
    target.cmsContentChoices = [
      ...(target.cmsContentChoices || []),
      ...source.cmsContentChoices.filter((c) => {
        const key = `${c.contentType || 'movie'}:${c.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }
  if (source.venueUpdatedStatuses) target.venueUpdatedStatuses = source.venueUpdatedStatuses;
  if (source.note && !target.note) target.note = source.note;
  return trimReportDetailArrays(target);
}

function mergeTheaterSyncReports(target, source) {
  if (!source) return target;
  if (!target) return { ...source };
  const counterKeys = [
    'createdFromTheaterShows',
    'createdFromTheaterVenues',
    'createdTheaterVenues',
    'alreadyExists',
    'updatedSoldOut',
    'skippedPast',
    'skippedNoVenue',
    'skippedUnknownEventId',
    'skippedInvalidDate',
    'resolvedViaVenueScrape',
    'scrapeTitleUnmatched',
  ];
  target.theaterShowsScanned = (target.theaterShowsScanned || 0) + (source.theaterShowsScanned || 0);
  for (const key of counterKeys) {
    target[key] = (target[key] || 0) + (source[key] || 0);
  }
  target.createdTheaterVenuesList = [
    ...(target.createdTheaterVenuesList || []),
    ...(source.createdTheaterVenuesList || []),
  ];
  target.byTheaterShow = [...(target.byTheaterShow || []), ...(source.byTheaterShow || [])];
  target.byTheaterVenue = [...(target.byTheaterVenue || []), ...(source.byTheaterVenue || [])];
  target.missingVenueIds = [...(target.missingVenueIds || []), ...(source.missingVenueIds || [])];
  target.errors = [...(target.errors || []), ...(source.errors || [])];
  target.scrapeTitleMisses = mergeUnmatchedTitleLists(
    target.scrapeTitleMisses,
    source.scrapeTitleMisses,
  ).scrapeTitleMisses;
  if (source.cmsContentChoices?.length) {
    const seen = new Set((target.cmsContentChoices || []).map((c) => `${c.contentType}:${c.id}`));
    target.cmsContentChoices = [
      ...(target.cmsContentChoices || []),
      ...source.cmsContentChoices.filter((c) => {
        const key = `${c.contentType || 'theater_show'}:${c.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    ];
  }
  if (source.note && !target.note) target.note = source.note;
  return trimReportDetailArrays(target);
}

/**
 * Μετρά πόσες more_sync εγγραφές (προβολές + παραστάσεις) δημιουργήθηκαν στη βάση από
 * τη στιγμή `sinceMs` και μετά — ανεξάρτητη επαλήθευση του «Νέες» της αναφοράς.
 */

function emptySyncCounters() {
  return {
    created: 0,
    alreadyExists: 0,
    dedupedSummerShowtimes: 0,
    updatedSoldOut: 0,
    skippedPast: 0,
    skippedNoVenue: 0,
    skippedUnknownEventId: 0,
    skippedInvalidDate: 0,
    resolvedViaVenueScrape: 0,
    errors: [],
  };
}


function trimReportDetailArrays(report) {
  if (!report || typeof report !== 'object') return report;
  delete report.onProgress;
  const cap = (arr, key) => {
    if (!Array.isArray(arr) || arr.length <= REPORT_DETAIL_MAX) return arr;
    report[`${key}Truncated`] = arr.length - REPORT_DETAIL_MAX;
    return arr.slice(0, REPORT_DETAIL_MAX);
  };
  report.byMovie = cap(report.byMovie, 'byMovie');
  report.byVenue = cap(report.byVenue, 'byVenue');
  report.byTheaterShow = cap(report.byTheaterShow, 'byTheaterShow');
  report.byTheaterVenue = cap(report.byTheaterVenue, 'byTheaterVenue');
  report.missingVenueIds = cap(report.missingVenueIds, 'missingVenueIds');
  report.errors = cap(report.errors, 'errors');
  report.scrapeTitleMisses = cap(report.scrapeTitleMisses, 'scrapeTitleMisses');
  return report;
}


function mergeReportValue(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a && b;
  if (typeof a === 'object' && typeof b === 'object') {
    const out = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out[key] = mergeReportValue(a[key], b[key]);
    }
    return out;
  }
  return b !== undefined && b !== '' ? b : a;
}

/**
 * Συνδυάζει per-phase reports (cinema + theater) σε ένα ενιαίο report.
 * Χρησιμοποιείται από το chained worker («Όλα» = δύο σειριακά processes).
 */
function combineSyncReports(reports) {
  const list = (reports || []).filter(Boolean);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];

  const merged = list.reduce((acc, r) => mergeReportValue(acc, r));
  merged.scope = 'all';
  merged.ok = list.every((r) => r.ok !== false);
  merged.at = new Date().toISOString();

  // Τα unmatched πρέπει να συγχωνεύονται ανά τίτλο (venues/eventIds), όχι απλό concat.
  merged.scrapeTitleMisses = mergeUnmatchedTitleLists(
    ...list.map((r) => r.scrapeTitleMisses),
  ).scrapeTitleMisses;
  merged.scrapeTitleUnmatched = list.reduce(
    (n, r) => n + (Number(r.scrapeTitleUnmatched) || 0),
    0,
  );

  merged.message =
    `Νέες: ${merged.created} (ταινίες: ${merged.createdFromMovies} · σινεμά bundle: ${merged.createdFromVenues}` +
    ` · θέατρο: ${merged.createdFromTheaterShows} · θέατρο bundle: ${merged.createdFromTheaterVenues})` +
    ` · υπήρχαν: ${merged.alreadyExists}` +
    (merged.createdCinemaVenues ? ` · νέα σινεμά: ${merged.createdCinemaVenues}` : '') +
    (merged.createdTheaterVenues ? ` · νέοι χώροι θεάτρου: ${merged.createdTheaterVenues}` : '') +
    (merged.updatedSoldOut ? ` · sold out ενημ.: ${merged.updatedSoldOut}` : '') +
    ` · χωρίς venue_id: ${merged.skippedNoVenue}` +
    ` · άγνωστο eventId: ${merged.skippedUnknownEventId}`;

  return merged;
}


module.exports = {
  compactSyncErrorMessage,
  pushSyncError,
  mergeMovieSyncReports,
  mergeTheaterSyncReports,
  emptySyncCounters,
  trimReportDetailArrays,
  mergeReportValue,
  combineSyncReports,
  REPORT_DETAIL_MAX,
};
