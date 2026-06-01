'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::restaurant.restaurant', ({ strapi }) => ({
  async googleReviews(ctx) {
    const slug = typeof ctx.params?.slug === 'string' ? ctx.params.slug.trim() : '';
    if (!slug) return ctx.badRequest('Λείπει slug εστιατορίου.');

    const data = await strapi.service('api::restaurant.restaurant').getGoogleReviewsBySlug(slug);
    ctx.body = { data };
  },
}));
