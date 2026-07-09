'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getUpdateQueues } = require('../services/venue-update-queue');

module.exports = createCoreController('api::venue.venue', () => ({
  async updateQueues(ctx) {
    ctx.body = await getUpdateQueues(strapi);
  },
}));
