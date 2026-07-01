'use strict';

const { parseProgramText, parseProgramFromImages, isAiEnabled, isOcrAvailable } = require('./programTextParse');
const { aiConfig, MAX_VISION_IMAGES } = require('./programTextAiParser');
const { formatWeekLabel } = require('./cinemaWeek');
const {
  findBestCmsMatchByPlayTitle,
  scorePlayTitleMatch,
  MIN_PLAY_TITLE_MATCH,
} = require('./morePlayTitleMatch');

const PREVIEW_MIN_SCORE = Number(process.env.PROGRAM_IMPORT_MATCH_MIN || 0.72);
const ALT_MATCH_LIMIT = 5;

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
  else if (venueOutdoor) source = 'venue';
  else if (detectedInText || hasPerShowtimeFlags) source = 'text';

  const applied = userChoice || venueOutdoor || detectedInText || hasPerShowtimeFlags;

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

async function showtimeExistsAt(strapi, { movieId, venueId, datetime }) {
  const t = datetime instanceof Date ? datetime.getTime() : new Date(datetime).getTime();
  if (Number.isNaN(t)) return false;
  const rows = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: {
      movie: { id: movieId },
      venue: { id: venueId },
      datetime: {
        $gte: new Date(t - 60_000).toISOString(),
        $lte: new Date(t + 60_000).toISOString(),
      },
    },
    limit: 1,
  });
  return Array.isArray(rows) && rows.length > 0;
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
  const summerScreeningDefault =
    summerScreening === true || venue.summer_outdoor === true;

  const movies = [];
  const proposals = [];
  let totalShowtimes = 0;
  let existingShowtimes = 0;
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
      const exists =
        match?.cmsId && st.datetime >= now
          ? await showtimeExistsAt(strapi, {
              movieId: match.cmsId,
              venueId: venue.id,
              datetime: st.datetime,
            })
          : false;
      if (exists) existingShowtimes += 1;

      const { dateLabel, timeLabel } = formatAthensWallClock(st.datetime);
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
        approved: !exists && Boolean(match?.cmsId),
        status: exists ? 'exists' : match?.cmsId ? 'new' : 'unmatched',
      };

      showtimes.push({
        dayLabel: st.dayLabel,
        timeLabel: st.timeLabel,
        datetime: st.datetime.toISOString(),
        note: st.note,
        summer_screening: resolveSummerScreeningForShowtime(st, { summerScreeningDefault }),
        exists,
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

  const summerMeta = buildSummerScreeningMeta({
    venue,
    text: programText,
    summerScreening: summerScreening === true,
    parsedMovies: parsed.movies,
  });

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
    cmsMovies: cmsMovies.map((m) => ({ id: m.id, title: m.title })),
    ocrPreview: parsed.ocrPreview,
    summary: {
      movieCount: movies.length,
      totalShowtimes,
      matchedMovies,
      unmatchedMovies,
      existingShowtimes,
      creatableShowtimes: totalShowtimes - existingShowtimes,
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

async function createProgramTextShowtimes(strapi, { venueId, items, now = new Date() } = {}) {
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
  };

  for (const item of list) {
    const movieId = Number(item.movieId);
    const parsedTitle = String(item.parsedTitle || '').trim();
    const showtimes = Array.isArray(item.showtimes) ? item.showtimes : [];

    if (!Number.isFinite(movieId)) {
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

      try {
        const exists = await showtimeExistsAt(strapi, {
          movieId,
          venueId: venue.id,
          datetime,
        });
        if (exists) {
          summary.skippedExists += 1;
          continue;
        }

        const note = st.note ? String(st.note).trim() : '';
        const traceParts = [
          'Εισαγωγή προγράμματος (admin)',
          `venue=${venue.name}`,
          parsedTitle ? `title=${parsedTitle}` : null,
          note ? `note=${note}` : null,
        ].filter(Boolean);

        await strapi.entityService.create('api::showtime.showtime', {
          data: {
            schedule_kind: 'exact',
            datetime: datetime.toISOString(),
            movie: movieId,
            venue: venue.id,
            summer_screening: st.summer_screening === true,
            import_source: 'manual',
            import_trace: traceParts.join(' · '),
          },
        });
        summary.created += 1;
      } catch (e) {
        summary.errors += 1;
        strapi.log.warn(`[program-import] create showtime failed: ${e?.message || e}`);
      }
    }
  }

  return { ok: true, venue: { id: venue.id, name: venue.name }, summary };
}

module.exports = {
  findAllCinemas,
  detectProgramSummerOutdoor,
  getProgramImportStatus,
  previewProgramTextImport,
  createProgramTextShowtimes,
};
