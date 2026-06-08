'use strict';

const {
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
  approveMoreEventGroupCode,
  loadPendingApprovalMovies,
  clearMoviePending,
  DEFAULT_MIN_SCORE,
  DEFAULT_APPLY_MIN_SCORE,
} = require('../../../utils/moreEventCodeLookup');
const { syncShowtimesFromMore, DEFAULT_HORIZON_DAYS } = require('../../../utils/moreShowtimeSync');

module.exports = {
  async status(ctx) {
    const pending = await loadPendingApprovalMovies(strapi);
    ctx.body = {
      enabled: process.env.MORE_LOOKUP_ENABLED !== 'false',
      showtimeSyncEnabled: process.env.MORE_SHOWTIME_SYNC_ENABLED !== 'false',
      minScore: DEFAULT_MIN_SCORE,
      applyMinScore: DEFAULT_APPLY_MIN_SCORE,
      showtimeHorizonDays: DEFAULT_HORIZON_DAYS,
      pendingApprovalCount: pending.length,
    };
  },

  async pending(ctx) {
    const pending = await loadPendingApprovalMovies(strapi);
    ctx.body = { ok: true, pending, count: pending.length };
  },

  async reject(ctx) {
    const movieId = ctx.request.body?.movieId;
    if (movieId == null) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: 'Απαιτείται movieId' } };
      return;
    }
    await clearMoviePending(strapi, Number(movieId));
    ctx.body = {
      ok: true,
      movieId: Number(movieId),
      pendingRemaining: (await loadPendingApprovalMovies(strapi)).length,
    };
  },

  async approve(ctx) {
    const body = ctx.request.body ?? {};
    const overwriteExisting = body.overwriteExisting === true;
    const adminEmail = ctx.state?.admin?.email || 'unknown';

    const items = Array.isArray(body.approvals)
      ? body.approvals
      : body.movieId != null
        ? [{ movieId: body.movieId, eventGroupCode: body.eventGroupCode }]
        : [];

    if (!items.length) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: 'Απαιτείται movieId ή approvals[]' } };
      return;
    }

    const approved = [];
    const errors = [];

    for (const item of items) {
      try {
        const result = await approveMoreEventGroupCode(strapi, {
          movieId: item.movieId,
          eventGroupCode: item.eventGroupCode,
          overwriteExisting,
        });
        approved.push(result);
        strapi.log.info(
          `[more-lookup] approved by ${adminEmail} movie ${result.movieId} → ${result.eventGroupCode}`,
        );
      } catch (e) {
        errors.push({
          movieId: item.movieId,
          error: e?.message || String(e),
        });
      }
    }

    ctx.body = {
      ok: errors.length === 0,
      approved,
      errors,
      message: `Εγκρίθηκαν ${approved.length} ταινίες${errors.length ? ` · ${errors.length} σφάλματα` : ''}`,
      pendingRemaining: (await loadPendingApprovalMovies(strapi)).length,
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
        result.pendingApproval = await loadPendingApprovalMovies(strapi);
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
        syncPending: matchCms,
      });
      ctx.body = {
        ...result,
        message: matchCms
          ? `Ταύτιση: ${result.stats.matched} αξιόπιστες · ${result.stats.pendingApproval} προς έγκριση`
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

  async syncShowtimes(ctx) {
    if (process.env.MORE_SHOWTIME_SYNC_ENABLED === 'false') {
      ctx.status = 503;
      ctx.body = {
        ok: false,
        error: { message: 'MORE_SHOWTIME_SYNC_ENABLED=false — ο συγχρονισμός προβολών είναι απενεργοποιημένος.' },
      };
      return;
    }

    const body = ctx.request.body ?? {};
    const movieId = body.movieId ?? ctx.query?.movieId;
    const adminEmail = ctx.state?.admin?.email || 'unknown';
    strapi.log.info(`[more-showtime-sync] manual run by ${adminEmail}`);

    try {
      const report = await syncShowtimesFromMore(strapi, {
        movieId: movieId != null && String(movieId).trim() ? Number(movieId) : undefined,
      });
      ctx.body = report;
    } catch (e) {
      strapi.log.error('[more-showtime-sync] failed', e);
      ctx.status = 500;
      ctx.body = { ok: false, error: { message: e?.message || String(e) } };
    }
  },
};
