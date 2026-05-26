'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { runSyncProgramStatus } = require('../services/sync-program-handler');

module.exports = createCoreController('api::venue.venue', ({ strapi }) => ({
  async syncProgramStatus(ctx) {
    try {
      ctx.body = await runSyncProgramStatus(strapi);
    } catch (err) {
      const detail = err?.message || String(err);
      strapi.log.error('[venue] syncProgramStatus απέτυχε:', detail, err);
      return ctx.internalServerError(
        process.env.NODE_ENV === 'development'
          ? `Αποτυχία ελέγχου προγράμματος: ${detail}`
          : 'Αποτυχία ελέγχου προγράμματος.',
      );
    }
  },
}));
