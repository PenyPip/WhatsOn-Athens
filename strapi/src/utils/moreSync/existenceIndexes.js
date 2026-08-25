'use strict';

const { findAllEntities } = require('./findAllEntities');

function showtimeMinuteKey(movieId, venueId, datetime) {
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  const mid = movieId != null ? String(movieId) : '?';
  return `${mid}|${venueId}|${Math.floor(t / 60000)}`;
}

function performanceMinuteKey(theaterShowId, venueId, datetime) {
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return `${theaterShowId}|${venueId}|${Math.floor(t / 60000)}`;
}

function showtimeExistsInIndex(index, movieId, venueId, datetime) {
  if (!index?.size) return false;
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const baseMinute = Math.floor(d.getTime() / 60000);
  const mid = movieId != null ? String(movieId) : '?';
  for (const delta of [-1, 0, 1]) {
    if (index.has(`${mid}|${venueId}|${baseMinute + delta}`)) return true;
  }
  return false;
}

function addShowtimeToExistenceIndex(index, movieId, venueId, datetime) {
  if (!index) return;
  const key = showtimeMinuteKey(movieId, venueId, datetime);
  if (key) index.add(key);
}

function findPerformanceInIndex(index, theaterShowId, venueId, datetime) {
  if (!index?.size) return null;
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  const baseMinute = Math.floor(d.getTime() / 60000);
  for (const delta of [-1, 0, 1]) {
    const key = `${theaterShowId}|${venueId}|${baseMinute + delta}`;
    if (index.has(key)) return index.get(key);
  }
  return null;
}

function setPerformanceInExistenceIndex(index, theaterShowId, venueId, datetime, entry) {
  if (!index) return;
  const key = performanceMinuteKey(theaterShowId, venueId, datetime);
  if (key) index.set(key, entry);
}

async function loadShowtimeExistenceIndex(strapi, movieIds, now, { venueIds } = {}) {
  const index = new Set();
  const movies = [...new Set((movieIds || []).filter((id) => id != null))];
  const venues = [...new Set((venueIds || []).filter((id) => id != null))];

  const filters = {
    datetime: { $gte: now.toISOString() },
  };
  if (movies.length) {
    filters.movie = { id: { $in: movies } };
  } else if (venues.length) {
    filters.venue = { id: { $in: venues } };
  }

  const rows = await findAllEntities(strapi, 'api::showtime.showtime', {
    filters,
    fields: ['datetime'],
    populate: {
      venue: { fields: ['id'] },
      movie: { fields: ['id'] },
    },
    pageSize: 250,
    maxRecords: 80_000,
    progressLabel: movies.length
      ? `Showtimes index (${movies.length} ταινίες)`
      : venues.length
        ? `Showtimes index (${venues.length} χώροι)`
        : 'Showtimes index (όλα)',
  });

  for (const row of rows) {
    const venueId = row.venue?.id ?? row.venue;
    const movieId = row.movie?.id ?? row.movie;
    const key = showtimeMinuteKey(movieId, venueId, row.datetime);
    if (key) index.add(key);
  }
  return index;
}

async function loadPerformanceExistenceIndex(strapi, theaterShowIds, now) {
  const index = new Map();
  const ids = [...new Set((theaterShowIds || []).filter((id) => id != null))];
  if (!ids.length) return index;

  const rows = await findAllEntities(strapi, 'api::theater-performance.theater-performance', {
    filters: {
      theater_show: { id: { $in: ids } },
      datetime: { $gte: now.toISOString() },
    },
    fields: ['id', 'datetime', 'sold_out'],
    populate: {
      venue: { fields: ['id'] },
      theater_show: { fields: ['id'] },
    },
    pageSize: 250,
    maxRecords: 80_000,
  });

  for (const row of rows) {
    const venueId = row.venue?.id ?? row.venue;
    const theaterShowId = row.theater_show?.id ?? row.theater_show;
    const key = performanceMinuteKey(theaterShowId, venueId, row.datetime);
    if (key) index.set(key, { id: row.id, sold_out: row.sold_out === true });
  }
  return index;
}


module.exports = {
  showtimeMinuteKey,
  performanceMinuteKey,
  showtimeExistsInIndex,
  addShowtimeToExistenceIndex,
  findPerformanceInIndex,
  setPerformanceInExistenceIndex,
  loadShowtimeExistenceIndex,
  loadPerformanceExistenceIndex,
};
