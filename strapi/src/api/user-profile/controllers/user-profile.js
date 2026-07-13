'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getPopularity } = require('../../../utils/userPopularity');

function requireUser(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.unauthorized('Authentication required');
    return null;
  }
  return user;
}

function mapMovie(row) {
  if (!row) return null;
  const poster = row.poster;
  const posterUrl =
    typeof poster === 'object' && poster?.url
      ? poster.url
      : typeof poster === 'object' && poster?.formats?.thumbnail?.url
        ? poster.formats.thumbnail.url
        : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.original_title,
    isDubbed: Boolean(row.is_dubbed),
    imdbRating: row.imdb_rating != null ? Number(row.imdb_rating) : null,
    posterUrl,
    genres: Array.isArray(row.movie_genres)
      ? row.movie_genres.map((g) => ({ slug: g.slug, label: g.label }))
      : [],
  };
}

function mapVenue(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summerOutdoor: Boolean(row.summer_outdoor),
    venueType: row.venue_type || null,
    city: row.city || null,
  };
}

function mapTheaterShow(row) {
  if (!row) return null;
  const poster = row.poster;
  const posterUrl =
    typeof poster === 'object' && poster?.url
      ? poster.url
      : typeof poster === 'object' && poster?.formats?.thumbnail?.url
        ? poster.formats.thumbnail.url
        : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    posterUrl,
  };
}

function sanitizeProfile(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    displayName: entry.display_name || null,
    favoriteMovies: (entry.favorite_movies || []).map(mapMovie).filter(Boolean),
    favoriteVenues: (entry.favorite_venues || []).map(mapVenue).filter(Boolean),
    seenMovies: (entry.seen_movies || []).map(mapMovie).filter(Boolean),
    seenTheaterShows: (entry.seen_theater_shows || []).map(mapTheaterShow).filter(Boolean),
  };
}

module.exports = createCoreController('api::user-profile.user-profile', ({ strapi }) => ({
  async me(ctx) {
    const user = requireUser(ctx);
    if (!user) return;
    const profile = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);
    ctx.body = {
      data: {
        ...sanitizeProfile(profile),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    };
  },

  async updateMe(ctx) {
    const user = requireUser(ctx);
    if (!user) return;
    const profile = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);
    const body = ctx.request.body || {};
    const displayName =
      typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : profile.display_name;

    const updated = await strapi.entityService.update('api::user-profile.user-profile', profile.id, {
      data: { display_name: displayName || null },
      populate: strapi.service('api::user-profile.user-profile').PROFILE_POPULATE,
    });

    ctx.body = { data: sanitizeProfile(updated) };
  },

  async toggleFavoriteMovie(ctx) {
    const user = requireUser(ctx);
    if (!user) return;
    const movieId = Number(ctx.params.movieId);
    if (!Number.isFinite(movieId) || movieId <= 0) return ctx.badRequest('Invalid movie id');

    const movie = await strapi.db.query('api::movie.movie').findOne({ where: { id: movieId } });
    if (!movie) return ctx.notFound('Movie not found');

    const profile = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);
    const toggle = await strapi.service('api::user-profile.user-profile').toggleFavoriteMovie(profile.id, movieId);
    const refreshed = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);

    ctx.body = { data: { ...toggle, profile: sanitizeProfile(refreshed) } };
  },

  async toggleFavoriteVenue(ctx) {
    const user = requireUser(ctx);
    if (!user) return;
    const venueId = Number(ctx.params.venueId);
    if (!Number.isFinite(venueId) || venueId <= 0) return ctx.badRequest('Invalid venue id');

    const venue = await strapi.db.query('api::venue.venue').findOne({ where: { id: venueId } });
    if (!venue) return ctx.notFound('Venue not found');

    const profile = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);
    const toggle = await strapi.service('api::user-profile.user-profile').toggleFavoriteVenue(profile.id, venueId);
    const refreshed = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);

    ctx.body = { data: { ...toggle, profile: sanitizeProfile(refreshed) } };
  },

  async toggleSeenMovie(ctx) {
    const user = requireUser(ctx);
    if (!user) return;
    const movieId = Number(ctx.params.movieId);
    if (!Number.isFinite(movieId) || movieId <= 0) return ctx.badRequest('Invalid movie id');

    const movie = await strapi.db.query('api::movie.movie').findOne({ where: { id: movieId } });
    if (!movie) return ctx.notFound('Movie not found');

    const profile = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);
    const toggle = await strapi.service('api::user-profile.user-profile').toggleSeenMovie(profile.id, movieId);
    const refreshed = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);

    ctx.body = { data: { ...toggle, profile: sanitizeProfile(refreshed) } };
  },

  async toggleSeenTheaterShow(ctx) {
    const user = requireUser(ctx);
    if (!user) return;
    const theaterShowId = Number(ctx.params.theaterShowId);
    if (!Number.isFinite(theaterShowId) || theaterShowId <= 0) return ctx.badRequest('Invalid theater show id');

    const show = await strapi.db.query('api::theater-show.theater-show').findOne({ where: { id: theaterShowId } });
    if (!show) return ctx.notFound('Theater show not found');

    const profile = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);
    const toggle = await strapi
      .service('api::user-profile.user-profile')
      .toggleSeenTheaterShow(profile.id, theaterShowId);
    const refreshed = await strapi.service('api::user-profile.user-profile').findOrCreateForUser(user.id);

    ctx.body = { data: { ...toggle, profile: sanitizeProfile(refreshed) } };
  },

  async moviePopularity(ctx) {
    const movieId = Number(ctx.params.movieId);
    if (!Number.isFinite(movieId) || movieId <= 0) return ctx.badRequest('Invalid movie id');
    const stats = await getPopularity(strapi, { movieId });
    ctx.body = { data: stats };
  },

  async venuePopularity(ctx) {
    const venueId = Number(ctx.params.venueId);
    if (!Number.isFinite(venueId) || venueId <= 0) return ctx.badRequest('Invalid venue id');
    const stats = await getPopularity(strapi, { venueId });
    ctx.body = { data: stats };
  },
}));
