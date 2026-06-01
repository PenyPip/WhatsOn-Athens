'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { fetchGooglePlaceReviews } = require('../../../utils/googlePlaces');

module.exports = createCoreService('api::restaurant.restaurant', ({ strapi }) => ({
  async getGoogleReviewsBySlug(slug) {
    const slugNorm = typeof slug === 'string' ? slug.trim() : '';
    const empty = {
      reviews: [],
      rating: null,
      userRatingCount: null,
      googleMapsUri: null,
      placeName: null,
    };
    if (!slugNorm) return empty;

    const rows = await strapi.entityService.findMany('api::restaurant.restaurant', {
      filters: { slug: slugNorm },
      fields: ['google_place_id', 'name'],
      limit: 1,
      publicationState: 'preview',
    });
    const restaurant = Array.isArray(rows) ? rows[0] : rows;
    if (!restaurant) return empty;

    const rawPlace = restaurant.google_place_id;
    if (!rawPlace || (typeof rawPlace === 'string' && !rawPlace.trim())) return empty;

    try {
      return await fetchGooglePlaceReviews(rawPlace);
    } catch (e) {
      strapi.log.warn(`[whatson] Google reviews for ${slugNorm}: ${e.message || e}`);
      return empty;
    }
  },
}));
