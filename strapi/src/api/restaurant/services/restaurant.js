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
      const data = await fetchGooglePlaceReviews(rawPlace);
      if (!data.reviews?.length && data.rating == null && !process.env.GOOGLE_PLACES_API_KEY?.trim()) {
        strapi.log.warn(`[whatson] Google reviews για ${slugNorm}: λείπει GOOGLE_PLACES_API_KEY στο .env`);
      }
      return data;
    } catch (e) {
      strapi.log.warn(`[whatson] Google reviews για ${slugNorm}: ${e.message || e}`);
      return empty;
    }
  },
}));
