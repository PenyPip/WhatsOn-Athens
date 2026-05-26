'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { runSyncProgramStatus } = require('../services/sync-program-handler');
const { verifyAdminRequest } = require('../../../utils/verifyAdminRequest');

module.exports = createCoreController('api::venue.venue', ({ strapi }) => ({
  async syncProgramStatus(ctx) {
    const admin = await verifyAdminRequest(ctx, strapi);
    if (!admin) {
      return ctx.forbidden('Απαιτείται σύνδεση admin.');
    }

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
