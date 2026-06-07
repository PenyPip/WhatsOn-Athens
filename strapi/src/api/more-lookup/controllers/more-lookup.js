'use strict';

const {
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
  DEFAULT_MIN_SCORE,
  DEFAULT_APPLY_MIN_SCORE,
} = require('../../../utils/moreEventCodeLookup');

module.exports = {
  async status(ctx) {
    ctx.body = {
      enabled: process.env.MORE_LOOKUP_ENABLED !== 'false',
      minScore: DEFAULT_MIN_SCORE,
      applyMinScore: DEFAULT_APPLY_MIN_SCORE,
    };
  },

  async run(ctx) {
    if (process.env.MORE_LOOKUP_ENABLED === 'false') {
      ctx.status = 503;
      ctx.body = {
        ok: false,
        error: { message: 'MORE_LOOKUP_ENABLED=false — η αναζήτηση More είναι απενεργοποιημένη.' },
      };
      return;
    }

    const body = ctx.request.body ?? {};
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const matchCms = body.matchCms !== false;
    const listAll = body.listAll === true;
    const skipVerify = body.skipVerify === true;
    const apply = body.apply === true;

    const adminEmail = ctx.state?.admin?.email || 'unknown';

    if (apply) {
      strapi.log.info(`[more-lookup] apply by ${adminEmail} query=${query || '-'}`);
      try {
        const result = await applyMoreEventCodeMatches(strapi, {
          query: query || null,
          overwriteExisting: body.overwriteExisting === true,
        });
        ctx.body = result;
      } catch (e) {
        strapi.log.error('[more-lookup] apply failed', e);
        ctx.status = 500;
        ctx.body = { ok: false, error: { message: e?.message || String(e) } };
      }
      return;
    }

    strapi.log.info(`[more-lookup] run by ${adminEmail} matchCms=${matchCms} query=${query || '-'}`);

    try {
      const result = await runMoreEventCodeLookup(strapi, {
        query: query || null,
        matchCms,
        listAll,
        skipVerify,
      });
      ctx.body = {
        ...result,
        message: matchCms
          ? `Ταύτιση CMS: ${result.stats.matched}/${result.stats.cmsMovies} ταινίες`
          : `Κατάλογος More: ${result.stats.catalogShown ?? result.catalog?.length ?? 0} εγγραφές`,
      };
    } catch (e) {
      strapi.log.error('[more-lookup] run failed', e);
      ctx.status = 500;
      ctx.body = {
        ok: false,
        error: { message: e?.message || String(e) },
      };
    }
  },
};
