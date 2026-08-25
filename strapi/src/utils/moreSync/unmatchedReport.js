'use strict';

const { collectVenueBundleCodes } = require('../moreEventGroupCodes');
const {
  findTopCmsMatchesByPlayTitle,
  SUGGESTION_MIN_SCORE,
  MIN_PLAY_TITLE_MATCH,
} = require('../morePlayTitleMatch');
const { unmatchedTitleKey, pushUnique } = require('./textNormalize');

const UNMATCHED_TITLE_CAP = 80;

function cmsVenueDisplayName(venue) {
  if (!venue || typeof venue !== 'object') return '';
  return String(
    venue.name ||
      venue.title ||
      venue.attributes?.name ||
      (venue.id != null ? `χώρος #${venue.id}` : ''),
  ).trim();
}

function attachVenueNamesToUnmatchedRow(row, names, venueId = null) {
  if (!row) return;
  for (const raw of names || []) {
    const name = String(raw || '').trim();
    if (!name) continue;
    row.venues = pushUnique(row.venues || [], name, 8);
    row.venueName = row.venueName || name;
  }
  if (venueId != null && row.venueId == null) row.venueId = venueId;
}

/**
 * Συμπληρώνει venues στα unmatched από ήδη-cached More events + CMS name.
 * Χωρίς νέα More API calls (μόνο peek).
 */
function enrichUnmatchedVenuesFromBundles(report, venuesWithBundle, eventsCache) {
  if (!report?.scrapeTitleMisses?.length || !eventsCache) return report;
  const namesByEventId = new Map();
  const peek =
    typeof eventsCache.peek === 'function'
      ? (code) => eventsCache.peek(code)
      : () => null;

  for (const venue of venuesWithBundle || []) {
    const cmsName = cmsVenueDisplayName(venue);
    const codes = venue.bundleCodes?.length
      ? venue.bundleCodes
      : collectVenueBundleCodes(venue);
    for (const code of codes || []) {
      const events = peek(code);
      if (!events?.length) continue;
      for (const event of events) {
        const eid = String(event?.eventId ?? '').trim();
        if (!eid) continue;
        if (!namesByEventId.has(eid)) namesByEventId.set(eid, new Set());
        const set = namesByEventId.get(eid);
        const moreName = String(event?.venueName || event?.venue_name || '').trim();
        if (moreName) set.add(moreName);
        if (cmsName) set.add(cmsName);
      }
    }
  }

  for (const row of report.scrapeTitleMisses) {
    const ids = row.eventIds?.length
      ? row.eventIds
      : row.eventId
        ? [row.eventId]
        : [];
    for (const eid of ids) {
      const names = namesByEventId.get(String(eid));
      if (!names?.size) continue;
      attachVenueNamesToUnmatchedRow(row, names);
    }
  }
  return report;
}

/** Γρήγορο attach από λίστα More events (pending scrape retry). */
function enrichUnmatchedFromEventList(report, events, cmsVenueName = '', cmsVenueId = null) {
  if (!report?.scrapeTitleMisses?.length || !events?.length) return;
  const cms = String(cmsVenueName || '').trim();
  for (const event of events) {
    const eventId = String(event?.eventId ?? '').trim();
    if (!eventId) continue;
    const moreName = String(event?.venueName || event?.venue_name || '').trim();
    for (const row of report.scrapeTitleMisses) {
      const ids = row.eventIds?.length
        ? row.eventIds.map(String)
        : row.eventId
          ? [String(row.eventId)]
          : [];
      if (!ids.includes(eventId)) continue;
      attachVenueNamesToUnmatchedRow(
        row,
        [moreName, cms].filter(Boolean),
        cmsVenueId,
      );
    }
  }
}

/** CMS όνομα χώρου σε unmatched που προήλθαν από το scrape αυτής της σελίδας. */
function attachCmsVenueToScrapeUnmatched(report, scrape, venue) {
  const cmsName = cmsVenueDisplayName(venue);
  if (!cmsName || !report?.scrapeTitleMisses?.length || !scrape?.byEventId?.size) return;
  const scrapeIds = new Set([...scrape.byEventId.keys()].map((k) => String(k)));
  for (const row of report.scrapeTitleMisses) {
    const ids = row.eventIds?.length
      ? row.eventIds.map(String)
      : row.eventId
        ? [String(row.eventId)]
        : [];
    if (!ids.some((id) => scrapeIds.has(id))) continue;
    attachVenueNamesToUnmatchedRow(row, [cmsName], venue?.id);
  }
}

/**
 * Ταινία/παράσταση από More scrape που δεν ταυτίστηκε με CMS — για χειροκίνητη αντιστοίχιση.
 */
function recordUnmatchedPlayTitle(report, { playTitle, venueName, venueId, eventId, playId, kind } = {}) {
  const title = String(playTitle || '').trim();
  if (!report || !title) return;
  report.scrapeTitleUnmatched = (report.scrapeTitleUnmatched || 0) + 1;
  if (!Array.isArray(report.scrapeTitleMisses)) report.scrapeTitleMisses = [];

  const label = String(venueName || '').trim();
  const key = unmatchedTitleKey(title);
  const existing = report.scrapeTitleMisses.find((row) => unmatchedTitleKey(row.playTitle) === key);
  if (existing) {
    existing.count = (existing.count || 1) + 1;
    attachVenueNamesToUnmatchedRow(existing, label ? [label] : [], venueId);
    existing.eventIds = pushUnique(existing.eventIds, eventId);
    existing.playIds = pushUnique(existing.playIds, playId);
    if (eventId && !existing.eventId) existing.eventId = String(eventId).trim();
    if (playId && !existing.playId) existing.playId = String(playId).trim();
    return;
  }
  if (report.scrapeTitleMisses.length >= UNMATCHED_TITLE_CAP) {
    report.scrapeTitleMissesCapped = true;
    report.scrapeTitleMissesDropped = (report.scrapeTitleMissesDropped || 0) + 1;
    return;
  }

  const row = {
    playTitle: title,
    eventId: eventId ? String(eventId).trim() : null,
    playId: playId ? String(playId).trim() : null,
    eventIds: eventId ? [String(eventId).trim()] : [],
    playIds: playId ? [String(playId).trim()] : [],
    venueId: venueId ?? null,
    venueName: label || null,
    venues: label ? [label] : [],
    kind: kind || 'movie',
    count: 1,
    suggestions: [],
  };
  report.scrapeTitleMisses.push(row);

  if (typeof report.onProgress === 'function') {
    report.onProgress(
      `Χωρίς ταύτιση CMS: «${title}»${label ? ` · ${label}` : ''}. Αντιστοίχισέ την χειροκίνητα αν υπάρχει.`,
    );
  }
}

function enrichUnmatchedTitlesWithSuggestions(report, cmsPool) {
  if (!report?.scrapeTitleMisses?.length || !cmsPool?.length) return report;
  for (const row of report.scrapeTitleMisses) {
    const suggestions = findTopCmsMatchesByPlayTitle(row.playTitle, cmsPool, {
      minScore: SUGGESTION_MIN_SCORE,
      limit: 5,
    });
    row.suggestions = suggestions;
    row.suggestedContent = suggestions[0] || null;
  }
  report.titleMatchHint = {
    autoMin: MIN_PLAY_TITLE_MATCH,
    suggestionMin: SUGGESTION_MIN_SCORE,
  };
  return report;
}

function slimCmsChoicesForUnmatched(cmsPool, kind = 'movie') {
  return (cmsPool || [])
    .filter((item) => !kind || !item.contentType || item.contentType === kind)
    .map((item) => ({
      id: item.id,
      title: item.title || item.name || `#${item.id}`,
      originalTitle: item.originalTitle || item.original_title || '',
      contentType: item.contentType || kind,
    }))
    .slice(0, 800);
}

function mergeUnmatchedTitleLists(...lists) {
  const acc = { scrapeTitleMisses: [], scrapeTitleUnmatched: 0 };
  for (const list of lists) {
    for (const row of list || []) {
      recordUnmatchedPlayTitle(acc, {
        playTitle: row.playTitle,
        venueName:
          row.venueName ||
          (Array.isArray(row.venues) && row.venues.length ? row.venues[0] : null),
        venueId: row.venueId,
        eventId: row.eventId || (Array.isArray(row.eventIds) ? row.eventIds[0] : null),
        playId: row.playId || (Array.isArray(row.playIds) ? row.playIds[0] : null),
        kind: row.kind,
      });
      const last = acc.scrapeTitleMisses.find(
        (r) => unmatchedTitleKey(r.playTitle) === unmatchedTitleKey(row.playTitle),
      );
      if (!last) continue;
      if (Number(row.count) > 1) {
        last.count = (last.count || 1) + (Number(row.count) - 1);
      }
      for (const id of row.eventIds || []) last.eventIds = pushUnique(last.eventIds, id);
      for (const id of row.playIds || []) last.playIds = pushUnique(last.playIds, id);
      attachVenueNamesToUnmatchedRow(last, row.venues || [], row.venueId);
      if (Array.isArray(row.suggestions) && row.suggestions.length && !last.suggestions?.length) {
        last.suggestions = row.suggestions;
        last.suggestedContent = row.suggestedContent || row.suggestions[0] || null;
      }
    }
  }
  return acc;
}

module.exports = {
  cmsVenueDisplayName,
  attachVenueNamesToUnmatchedRow,
  enrichUnmatchedVenuesFromBundles,
  enrichUnmatchedFromEventList,
  attachCmsVenueToScrapeUnmatched,
  recordUnmatchedPlayTitle,
  enrichUnmatchedTitlesWithSuggestions,
  slimCmsChoicesForUnmatched,
  mergeUnmatchedTitleLists,
  UNMATCHED_TITLE_CAP,
};
