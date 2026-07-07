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
    fields: ['id', 'slug', 'name', 'summer_outdoor', 'venue_type', 'city'],
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
}));
