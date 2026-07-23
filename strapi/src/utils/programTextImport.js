'use strict';

const { parseProgramText, parseProgramFromImages, isAiEnabled, isOcrAvailable } = require('./programTextParse');
const { aiConfig, MAX_VISION_IMAGES } = require('./programTextAiParser');
const { formatWeekLabel, isDatetimeInTargetCinemaWeekForVenueStatus } = require('./cinemaWeek');
const {
  applyVenueUpdatedStatusFromProgramImport,
  VENUE_UPDATED_LABELS,
} = require('../api/venue/services/venue-updated-status');
const {
  findBestCmsMatchByPlayTitle,
  scorePlayTitleMatch,
  MIN_PLAY_TITLE_MATCH,
} = require('./morePlayTitleMatch');

const PREVIEW_MIN_SCORE = Number(process.env.PROGRAM_IMPORT_MATCH_MIN || 0.72);
const ALT_MATCH_LIMIT = 5;
const CREATE_CONCURRENCY = Math.max(2, Number(process.env.PROGRAM_IMPORT_CREATE_CONCURRENCY || 8));

let moviesCache = { at: 0, rows: null };
const MOVIES_CACHE_TTL_MS = 60_000;

async function findAllMovies(strapi, { bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && moviesCache.rows && now - moviesCache.at < MOVIES_CACHE_TTL_MS) {
    return moviesCache.rows;
  }
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
  const mapped = rows.map((row) => ({
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    slug: row.slug,
    contentType: 'movie',
  }));
  moviesCache = { at: Date.now(), rows: mapped };
  return mapped;
}

function minuteKey(datetime) {
  const t = datetime instanceof Date ? datetime.getTime() : new Date(datetime).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round(t / 60_000);
}

function showtimeSlotKey(movieId, datetime) {
  const mk = minuteKey(datetime);
  if (mk == null || movieId == null) return null;
  return `${Number(movieId)}|${mk}`;
}

/**
 * Ένα query για όλα τα showtimes του venue στο εύρος του προγράμματος.
 * @returns {Promise<Set<string>>} keys `${movieId}|${minute}`
 */
async function loadExistingShowtimeKeySet(strapi, venueId, datetimes) {
  const keys = new Set();
  const times = (datetimes || [])
    .map((d) => (d instanceof Date ? d.getTime() : new Date(d).getTime()))
    .filter((t) => Number.isFinite(t));
  if (!times.length) return keys;

  const min = Math.min(...times) - 120_000;
  const max = Math.max(...times) + 120_000;
  let page = 1;
  const pageSize = 500;
  while (page <= 40) {
    const batch = await strapi.entityService.findMany('api::showtime.showtime', {
      filters: {
        venue: { id: venueId },
        datetime: {
          $gte: new Date(min).toISOString(),
          $lte: new Date(max).toISOString(),
        },
      },
      fields: ['id', 'datetime'],
      populate: { movie: { fields: ['id'] } },
      pagination: { page, pageSize },
    });
    const list = Array.isArray(batch) ? batch : [];
    if (!list.length) break;
    for (const row of list) {
      const movieId = row.movie?.id ?? row.movie;
      const k = showtimeSlotKey(movieId, row.datetime);
      if (k) keys.add(k);
    }
    if (list.length < pageSize) break;
    page += 1;
  }
  return keys;
}

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

async function findAllCinemas(strapi) {
  const rows = [];
  let page = 1;
  const pageSize = 200;
  while (page <= 20) {
    const batch = await strapi.entityService.findMany('api::venue.venue', {
      filters: { type: 'cinema' },
      fields: ['id', 'name', 'slug', 'summer_outdoor'],
      publicationState: 'preview',
      sort: { name: 'asc' },
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
    name: row.name,
    slug: row.slug,
    summerOutdoor: row.summer_outdoor === true,
  }));
}

function detectProgramSummerOutdoor(text) {
  const hay = String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  if (!hay.trim()) return false;
  return /θεριν[οόςη]|therino|\bsummer\b/i.test(hay);
}

function resolveSummerScreeningForShowtime(st, { summerScreeningDefault }) {
  if (st.summer_screening === true) return true;
  return summerScreeningDefault === true;
}

function buildSummerScreeningMeta({ venue, text, summerScreening, parsedMovies }) {
  const venueOutdoor = venue.summer_outdoor === true;
  const detectedInText = detectProgramSummerOutdoor(text);
  const hasPerShowtimeFlags = (parsedMovies || []).some((movie) =>
    (movie.showtimes || []).some((st) => st.summer_screening === true),
  );
  const userChoice = summerScreening === true;
  let source = 'none';
  if (userChoice) source = 'user';
  else if (venueOutdoor && !hasPerShowtimeFlags) source = 'venue';
  else if (detectedInText || hasPerShowtimeFlags) source = 'text';

  const applied = userChoice || (venueOutdoor && !hasPerShowtimeFlags) || detectedInText || hasPerShowtimeFlags;

  return {
    applied,
    source,
    userChoice,
    venueOutdoor,
    detectedInText,
    hasPerShowtimeFlags,
  };
}

async function loadVenue(strapi, venueId) {
  const id = Number(venueId);
  if (!Number.isFinite(id)) return null;
  return strapi.entityService.findOne('api::venue.venue', id, {
    fields: ['id', 'name', 'slug', 'type', 'summer_outdoor'],
    publicationState: 'preview',
  });
}

function movieAlternatives(parsedTitle, cmsMovies, { limit = ALT_MATCH_LIMIT } = {}) {
  const scored = (cmsMovies || [])
    .map((item) => {
      const scores = [
        scorePlayTitleMatch(item.title, parsedTitle),
        item.originalTitle ? scorePlayTitleMatch(item.originalTitle, parsedTitle) : 0,
      ];
      return {
        cmsId: item.id,
        cmsTitle: item.title,
        score: Number(Math.max(...scores).toFixed(3)),
      };
    })
    .filter((row) => row.score >= 0.45)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

const { formatAthensWallClock } = require('./athensTime');

async function findShowtimesAtSlot(strapi, { movieId, venueId, datetime }) {
  const t = datetime instanceof Date ? datetime.getTime() : new Date(datetime).getTime();
  if (Number.isNaN(t)) return [];
  const rows = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: {
      movie: { id: movieId },
      venue: { id: venueId },
      datetime: {
        $gte: new Date(t - 60_000).toISOString(),
        $lte: new Date(t + 60_000).toISOString(),
      },
    },
    fields: ['id', 'datetime'],
    sort: { id: 'desc' },
    limit: 50,
  });
  return Array.isArray(rows) ? rows : [];
}

async function deleteOlderDuplicateShowtimes(strapi, rows) {
  if (!Array.isArray(rows) || rows.length <= 1) return 0;
  const sorted = [...rows].sort((a, b) => Number(b.id) - Number(a.id));
  let deleted = 0;
  for (const row of sorted.slice(1)) {
    if (row?.id == null) continue;
    try {
      await strapi.entityService.delete('api::showtime.showtime', row.id);
      deleted += 1;
    } catch (e) {
      strapi.log.warn(`[program-import] summer dedupe delete #${row.id}: ${e?.message || e}`);
    }
  }
  return deleted;
}

async function showtimeExistsAt(strapi, { movieId, venueId, datetime }) {
  const rows = await findShowtimesAtSlot(strapi, { movieId, venueId, datetime });
  return rows.length > 0;
}

function getProgramImportStatus() {
  const cfg = aiConfig();
  return {
    aiEnabled: isAiEnabled(),
    ocrEnabled: isOcrAvailable(),
    aiModel: cfg.model,
    visionModel: cfg.visionModel,
    maxImages: MAX_VISION_IMAGES,
    matchMinScore: PREVIEW_MIN_SCORE,
  };
}

async function buildPreviewFromParsed(
  strapi,
  { venue, parsed, inputKind = 'text', programText = '', summerScreening = false } = {},
) {
  const cmsMovies = await findAllMovies(strapi);
  const now = new Date();
  const summerMeta = buildSummerScreeningMeta({
    venue,
    text: programText,
    summerScreening: summerScreening === true,
    parsedMovies: parsed.movies,
  });
  const summerScreeningDefault =
    summerMeta.userChoice === true || (summerMeta.venueOutdoor === true && !summerMeta.hasPerShowtimeFlags);

  const allDatetimes = [];
  for (const movie of parsed.movies || []) {
    for (const st of movie.showtimes || []) {
      if (st?.datetime) allDatetimes.push(st.datetime);
    }
  }
  const existingKeys = await loadExistingShowtimeKeySet(strapi, venue.id, allDatetimes);

  const movies = [];
  const proposals = [];
  let totalShowtimes = 0;
  let existingShowtimes = 0;
  let pastShowtimes = 0;
  let proposalIdx = 0;

  for (const movie of parsed.movies) {
    const match = findBestCmsMatchByPlayTitle(movie.title, cmsMovies, {
      minScore: PREVIEW_MIN_SCORE,
    });
    const alternatives = match ? [] : movieAlternatives(movie.title, cmsMovies);

    const showtimes = [];
    for (const st of movie.showtimes) {
      totalShowtimes += 1;
      proposalIdx += 1;
      const isPast = st.datetime < now;
      if (isPast) pastShowtimes += 1;

      const slotKey = match?.cmsId ? showtimeSlotKey(match.cmsId, st.datetime) : null;
      const exists = Boolean(slotKey && existingKeys.has(slotKey));
      if (exists) existingShowtimes += 1;

      const { dateLabel, timeLabel } = formatAthensWallClock(st.datetime);
      let status = 'unmatched';
      if (isPast) status = 'past';
      else if (exists) status = 'exists';
      else if (match?.cmsId) status = 'new';

      const row = {
        id: `p-${proposalIdx}`,
        parsedTitle: movie.title,
        movieMatch: match,
        movieId: match?.cmsId ?? null,
        cmsTitle: match?.cmsTitle ?? null,
        datetime: st.datetime.toISOString(),
        dateLabel,
        timeLabel,
        dayLabel: st.dayLabel,
        note: st.note,
        summer_screening: resolveSummerScreeningForShowtime(st, { summerScreeningDefault }),
        exists,
        isPast,
        // Παρελθόν / ήδη υπάρχοντα δεν εγκρίνονται — αλλιώς «μένουν» μετά το create.
        approved: !isPast && !exists && Boolean(match?.cmsId),
        status,
      };

      showtimes.push({
        dayLabel: st.dayLabel,
        timeLabel: st.timeLabel,
        datetime: st.datetime.toISOString(),
        note: st.note,
        summer_screening: resolveSummerScreeningForShowtime(st, { summerScreeningDefault }),
        exists,
        isPast,
      });
      proposals.push(row);
    }

    movies.push({
      parsedTitle: movie.title,
      scheduleText: movie.scheduleText,
      movieMatch: match,
      alternatives,
      showtimes,
    });
  }

  const matchedMovies = movies.filter((m) => m.movieMatch).length;
  const unmatchedMovies = movies.length - matchedMovies;
  const approvableCount = proposals.filter((p) => p.approved).length;

  return {
    ok: true,
    venue: {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      summerOutdoor: venue.summer_outdoor === true,
    },
    summerScreening: summerMeta,
    inputKind,
    header: parsed.header,
    parseSource: parsed.parseSource || 'regex',
    imageCount: parsed.imageCount || 0,
    dateRange: parsed.dateRange
      ? {
          start: parsed.dateRange.start.toISOString(),
          end: parsed.dateRange.end.toISOString(),
          label: formatWeekLabel(parsed.dateRange.start, parsed.dateRange.end),
          inferred: parsed.dateRange.inferred === true,
        }
      : null,
    warnings: parsed.warnings,
    movies,
    proposals,
    // Slim list για manual pick — το UI φιλτράρει τοπικά με αναζήτηση.
    cmsMovies: cmsMovies.map((m) => ({
      id: m.id,
      title: m.title,
      originalTitle: m.originalTitle || null,
    })),
    ocrPreview: parsed.ocrPreview,
    summary: {
      movieCount: movies.length,
      totalShowtimes,
      matchedMovies,
      unmatchedMovies,
      existingShowtimes,
      pastShowtimes,
      creatableShowtimes: Math.max(0, totalShowtimes - existingShowtimes - pastShowtimes),
      approvableCount,
    },
    matchMinScore: PREVIEW_MIN_SCORE,
    defaultMatchMinScore: MIN_PLAY_TITLE_MATCH,
    ai: getProgramImportStatus(),
  };
}

async function previewProgramTextImport(
  strapi,
  { text, images, venueId, refYear, summerScreening } = {},
) {
  const venue = await loadVenue(strapi, venueId);
  if (!venue) {
    return { ok: false, error: 'Άκυρος ή ελλιπής κινηματογράφος (venueId).' };
  }
  if (venue.type !== 'cinema') {
    return { ok: false, error: 'Ο επιλεγμένος χώρος δεν είναι κινηματογράφος.' };
  }

  const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
  const trimmed = String(text || '').trim();

  let parsed;
  let inputKind = 'text';

  if (imageList.length > 0) {
    inputKind = 'image';
    parsed = await parseProgramFromImages(imageList, {
      refYear,
      venueName: venue.name,
      now: new Date(),
    });
  } else if (trimmed) {
    parsed = await parseProgramText(trimmed, {
      refYear,
      venueName: venue.name,
      now: new Date(),
    });
  } else {
    return { ok: false, error: 'Δώσε κείμενο ή εικόνα προγράμματος.' };
  }

  if (!parsed.movies?.length) {
    return {
      ok: false,
      error:
        parsed.parseSource === 'ai_failed' || parsed.parseSource === 'ocr_failed'
          ? parsed.warnings?.[0] || 'Η ανάλυση δεν βρήκε ταινίες.'
          : 'Δεν βρέθηκαν ταινίες ή προβολές.',
      warnings: parsed.warnings,
      parseSource: parsed.parseSource,
      ocrPreview: parsed.ocrPreview,
    };
  }

  return buildPreviewFromParsed(strapi, {
    venue,
    parsed,
    inputKind,
    programText: trimmed || parsed.ocrPreview || '',
    summerScreening: summerScreening === true,
  });
}

async function createProgramTextShowtimes(
  strapi,
  { venueId, items, importMeta = {}, now = new Date() } = {},
) {
  const venue = await loadVenue(strapi, venueId);
  if (!venue) {
    return { ok: false, error: 'Άκυρος κινηματογράφος (venueId).' };
  }
  if (venue.type !== 'cinema') {
    return { ok: false, error: 'Ο χώρος δεν είναι κινηματογράφος.' };
  }

  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return { ok: false, error: 'Δεν δόθηκαν προβολές για δημιουργία.' };
  }

  const summary = {
    created: 0,
    skippedExists: 0,
    skippedPast: 0,
    skippedNoMovie: 0,
    skippedNotApproved: 0,
    errors: 0,
    details: [],
    weekExpected: 0,
    weekSynced: 0,
    weekFailed: 0,
    weekSkippedNotApproved: 0,
    weekSkippedNoMovie: 0,
  };

  const createdSlots = [];
  const trackWeekFailure = () => {
    summary.weekFailed += 1;
  };

  // Συλλογή slots προς δημιουργία (μόνο approved + με movie).
  const work = [];
  for (const item of list) {
    const movieId = Number(item.movieId);
    const parsedTitle = String(item.parsedTitle || '').trim();
    const showtimes = Array.isArray(item.showtimes) ? item.showtimes : [];
    const hasMovie = Number.isFinite(movieId);

    if (!hasMovie) {
      for (const st of showtimes) {
        const datetime = new Date(st.datetime);
        if (Number.isNaN(datetime.getTime()) || datetime < now) continue;
        if (!isDatetimeInTargetCinemaWeekForVenueStatus(datetime, now)) continue;
        summary.weekExpected += 1;
        summary.weekSkippedNoMovie += 1;
        trackWeekFailure();
      }
      summary.skippedNoMovie += showtimes.filter((st) => st.create !== false && st.approved !== false).length;
      summary.details.push({
        parsedTitle,
        status: 'skipped',
        reason: 'missing_movie',
      });
      continue;
    }

    for (const st of showtimes) {
      if (st.create === false || st.skip === true || st.approved === false) {
        summary.skippedNotApproved += 1;
        const datetime = new Date(st.datetime);
        if (
          !Number.isNaN(datetime.getTime()) &&
          datetime >= now &&
          isDatetimeInTargetCinemaWeekForVenueStatus(datetime, now)
        ) {
          summary.weekExpected += 1;
          summary.weekSkippedNotApproved += 1;
          trackWeekFailure();
        }
        continue;
      }

      const datetime = new Date(st.datetime);
      if (Number.isNaN(datetime.getTime())) {
        summary.errors += 1;
        continue;
      }
      if (datetime < now) {
        summary.skippedPast += 1;
        continue;
      }

      work.push({
        movieId,
        parsedTitle,
        datetime,
        note: st.note,
        summer_screening: st.summer_screening === true,
      });
    }
  }

  const existingKeys = await loadExistingShowtimeKeySet(
    strapi,
    venue.id,
    work.map((w) => w.datetime),
  );

  const outcomes = await mapPool(work, CREATE_CONCURRENCY, async (job) => {
    const inTargetWeek = isDatetimeInTargetCinemaWeekForVenueStatus(job.datetime, now);
    try {
      const slotKey = showtimeSlotKey(job.movieId, job.datetime);
      if (slotKey && existingKeys.has(slotKey)) {
        return { type: 'exists', inTargetWeek };
      }

      const matches = await findShowtimesAtSlot(strapi, {
        movieId: job.movieId,
        venueId: venue.id,
        datetime: job.datetime,
      });
      if (matches.length > 0) {
        let dedupedSummer = 0;
        if (venue.summer_outdoor === true && matches.length > 1) {
          dedupedSummer = await deleteOlderDuplicateShowtimes(strapi, matches);
        }
        if (slotKey) existingKeys.add(slotKey);
        return { type: 'exists', inTargetWeek, dedupedSummer };
      }

      const note = job.note ? String(job.note).trim() : '';
      const traceParts = [
        'Εισαγωγή προγράμματος (admin)',
        `venue=${venue.name}`,
        job.parsedTitle ? `title=${job.parsedTitle}` : null,
        note ? `note=${note}` : null,
      ].filter(Boolean);

      await strapi.entityService.create('api::showtime.showtime', {
        data: {
          schedule_kind: 'exact',
          datetime: job.datetime.toISOString(),
          movie: job.movieId,
          venue: venue.id,
          summer_screening: job.summer_screening === true,
          import_source: 'manual',
          import_trace: traceParts.join(' · '),
        },
      });
      if (slotKey) existingKeys.add(slotKey);
      return {
        type: 'created',
        inTargetWeek,
        slot: {
          movieId: job.movieId,
          datetime: job.datetime.toISOString(),
          parsedTitle: job.parsedTitle,
        },
      };
    } catch (e) {
      strapi.log.warn(`[program-import] create showtime failed: ${e?.message || e}`);
      return { type: 'error', inTargetWeek };
    }
  });

  for (const outcome of outcomes) {
    if (!outcome) continue;
    if (outcome.inTargetWeek) summary.weekExpected += 1;
    if (outcome.type === 'created') {
      summary.created += 1;
      if (outcome.slot) createdSlots.push(outcome.slot);
      if (outcome.inTargetWeek) summary.weekSynced += 1;
    } else if (outcome.type === 'exists') {
      summary.skippedExists += 1;
      if (outcome.dedupedSummer) {
        summary.dedupedSummer = (summary.dedupedSummer || 0) + outcome.dedupedSummer;
      }
      if (outcome.inTargetWeek) summary.weekSynced += 1;
    } else if (outcome.type === 'error') {
      summary.errors += 1;
      if (outcome.inTargetWeek) trackWeekFailure();
    }
  }
  const meta = {
    unmatchedMovies: Number(importMeta.unmatchedMovies || 0),
  };

  const venueUpdated = await applyVenueUpdatedStatusFromProgramImport(
    strapi,
    venue.id,
    {
      created: summary.created,
      alreadyExists: summary.skippedExists,
      errors: summary.errors,
      weekExpected: summary.weekExpected,
      weekSynced: summary.weekSynced,
      weekFailed: summary.weekFailed,
      unmatchedMovies: meta.unmatchedMovies,
    },
    { importMeta: meta, now },
  );

  return {
    ok: true,
    venue: { id: venue.id, name: venue.name },
    summary,
    createdSlots,
    venueUpdated,
    venueUpdatedLabel: venueUpdated?.status ? VENUE_UPDATED_LABELS[venueUpdated.status] : null,
  };
}

module.exports = {
  findAllCinemas,
  detectProgramSummerOutdoor,
  getProgramImportStatus,
  previewProgramTextImport,
  createProgramTextShowtimes,
};
