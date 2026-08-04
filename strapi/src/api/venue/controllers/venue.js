'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { getUpdateQueues } = require('../services/venue-update-queue');
const { syncPendingAthinoramaVenues } = require('../../../utils/athinoramaShowtimeSync');

module.exports = createCoreController('api::venue.venue', () => ({
  async updateQueues(ctx) {
    ctx.body = await getUpdateQueues(strapi);
  },

  async syncAthinoramaPending(ctx) {
    const body = ctx.request.body ?? {};
    const report = await syncPendingAthinoramaVenues(strapi, {
      includeDrafts: body.includeDrafts === true,
    });
    ctx.body = report;
  },
}));
