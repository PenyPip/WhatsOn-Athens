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
      status: null,
    };
    if (!slugNorm) return empty;

    const rows = await strapi.entityService.findMany('api::restaurant.restaurant', {
      filters: { slug: slugNorm },
      fields: ['google_place_id', 'name'],
      limit: 1,
      publicationState: 'preview',
    });
    const restaurant = Array.isArray(rows) ? rows[0] : rows;
    if (!restaurant) return { ...empty, status: 'not_found' };

    const rawPlace =
      typeof restaurant.google_place_id === 'string' ? restaurant.google_place_id.trim() : '';
    if (!rawPlace) return { ...empty, status: 'missing_maps_link' };

    const restaurantName = typeof restaurant.name === 'string' ? restaurant.name.trim() : '';

    try {
      const data = await fetchGooglePlaceReviews(rawPlace, { restaurantName });
      if (data.status === 'missing_api_key') {
        strapi.log.warn(
          `[whatson] Google reviews για ${slugNorm}: λείπει GOOGLE_PLACES_API_KEY στο strapi/.env`,
        );
      } else if (data.status === 'unresolved_place') {
        strapi.log.warn(
          `[whatson] Google reviews για ${slugNorm}: δεν επιλύθηκε το μέρος από το Maps link (${rawPlace.slice(0, 60)}…)`,
        );
      }
      return data;
    } catch (e) {
      strapi.log.warn(`[whatson] Google reviews για ${slugNorm}: ${e.message || e}`);
      return { ...empty, status: 'api_error' };
    }
  },
}));
