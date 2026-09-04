'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

const PROFILE_POPULATE = {
  favorite_movies: {
    fields: ['id', 'slug', 'title', 'original_title', 'is_dubbed', 'imdb_rating'],
    populate: {
      poster: { fields: ['url', 'formats'] },
      movie_genres: { fields: ['slug', 'label', 'sort_order'] },
    },
  },
  favorite_venues: {
    fields: ['id', 'slug', 'name', 'summer_outdoor', 'type', 'city'],
  },
  seen_movies: {
    fields: ['id', 'slug', 'title', 'original_title', 'is_dubbed', 'imdb_rating'],
    populate: {
      poster: { fields: ['url', 'formats'] },
      movie_genres: { fields: ['slug', 'label', 'sort_order'] },
    },
  },
  seen_theater_shows: {
    fields: ['id', 'slug', 'title'],
    populate: {
      poster: { fields: ['url', 'formats'] },
    },
  },
};

async function findProfileByUserId(strapi, userId) {
  return strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
    populate: PROFILE_POPULATE,
  });
}

module.exports = createCoreService('api::user-profile.user-profile', ({ strapi }) => ({
  PROFILE_POPULATE,

  async findOrCreateForUser(userId) {
    const existing = await findProfileByUserId(strapi, userId);
    if (existing) return existing;

    return strapi.entityService.create('api::user-profile.user-profile', {
      data: { user: userId },
      populate: PROFILE_POPULATE,
    });
  },

  async toggleFavoriteMovie(profileId, movieId) {
    return this.toggleRelation(profileId, 'favorite_movies', movieId);
  },

  async toggleFavoriteVenue(profileId, venueId) {
    return this.toggleRelation(profileId, 'favorite_venues', venueId);
  },

  async toggleSeenMovie(profileId, movieId) {
    return this.toggleRelation(profileId, 'seen_movies', movieId);
  },

  async toggleSeenTheaterShow(profileId, theaterShowId) {
    return this.toggleRelation(profileId, 'seen_theater_shows', theaterShowId);
  },

  /** Αφαίρεση από αγαπημένα αν υπάρχει (χωρίς toggle). */
  async removeFavoriteMovie(profileId, movieId) {
    const profile = await strapi.entityService.findOne('api::user-profile.user-profile', profileId, {
      populate: ['favorite_movies'],
    });
    const numericId = Number(movieId);
    const current = (profile?.favorite_movies || []).map((row) => Number(row.id));
    if (!current.includes(numericId)) return { removed: false };
    await strapi.entityService.update('api::user-profile.user-profile', profileId, {
      data: { favorite_movies: current.filter((id) => id !== numericId) },
    });
    return { removed: true };
  },

  async toggleRelation(profileId, field, entityId) {
    const profile = await strapi.entityService.findOne('api::user-profile.user-profile', profileId, {
      populate: [field],
    });
    const numericId = Number(entityId);
    const current = (profile?.[field] || []).map((row) => Number(row.id));
    const active = !current.includes(numericId);
    const next = active ? [...current, numericId] : current.filter((id) => id !== numericId);

    await strapi.entityService.update('api::user-profile.user-profile', profileId, {
      data: { [field]: next },
    });

    return { active };
  },

  async isTheaterShowSeen(userId, theaterShowId) {
    const profile = await findProfileByUserId(strapi, userId);
    if (!profile) return false;
    const sid = Number(theaterShowId);
    return (profile.seen_theater_shows || []).some((row) => Number(row.id) === sid);
  },
}));
