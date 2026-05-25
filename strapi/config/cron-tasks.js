'use strict';

const ATHENS_TZ = 'Europe/Athens';

/**
 * Κάθε Σάββατο 14:00 (Europe/Athens): updated → false για όλα τα σινεμά.
 */
async function resetCinemaProgramUpdated(strapi) {
  const venues = await strapi.entityService.findMany('api::venue.venue', {
    filters: { type: 'cinema' },
    fields: ['id'],
    publicationState: 'preview',
  });

  let count = 0;
  for (const venue of venues) {
    await strapi.entityService.update('api::venue.venue', venue.id, {
      data: { updated: false },
    });
    count += 1;
  }

  strapi.log.info(`[cron] venue.updated=false για ${count} σινεμά (Σάββατο 14:00 ${ATHENS_TZ})`);
}

module.exports = {
  resetCinemaProgramUpdated: {
    task: async ({ strapi }) => {
      try {
        await resetCinemaProgramUpdated(strapi);
      } catch (err) {
        strapi.log.error('[cron] resetCinemaProgramUpdated απέτυχε', err);
      }
    },
    options: {
      rule: '0 14 * * 6',
      tz: ATHENS_TZ,
    },
  },
};
