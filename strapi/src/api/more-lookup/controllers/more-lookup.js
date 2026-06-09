'use strict';

const {
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
  approveMoreEventGroupCode,
  rejectMoreEventGroupCode,
  loadPendingApprovalItems,
  clearCmsPending,
  DEFAULT_MIN_SCORE,
  DEFAULT_APPLY_MIN_SCORE,
} = require('../../../utils/moreEventCodeLookup');
const { syncShowtimesFromMore } = require('../../../utils/moreShowtimeSync');
const {
  getMoreShowtimeSyncJob,
  startMoreShowtimeSyncJob,
} = require('../../../utils/moreShowtimeSyncJob');
const { getMoreProxyStatus } = require('../../../utils/moreHttp');

module.exports = {
  async status(ctx) {
    const pending = await loadPendingApprovalItems(strapi);
    ctx.body = {
      enabled: process.env.MORE_LOOKUP_ENABLED !== 'false',
      showtimeSyncEnabled: process.env.MORE_SHOWTIME_SYNC_ENABLED !== 'false',
      showtimeSyncJob: getMoreShowtimeSyncJob(),
      lookupJob: getMoreLookupJob(),
      moreProxy: getMoreProxyStatus(),
      minScore: DEFAULT_MIN_SCORE,
      applyMinScore: DEFAULT_APPLY_MIN_SCORE,
      pendingApprovalCount: pending.length,
    };
  },

  async pending(ctx) {
    const pending = await loadPendingApprovalItems(strapi);
    ctx.body = { ok: true, pending, count: pending.length };
  },

  async reject(ctx) {
    const body = ctx.request.body ?? {};
    const contentType =
      body.contentType || (body.theaterShowId != null ? 'theater_show' : 'movie');
    const cmsId = Number(body.cmsId ?? body.movieId ?? body.theaterShowId);
    if (!Number.isFinite(cmsId)) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: 'Απαιτείται cmsId / movieId / theaterShowId' } };
      return;
    }

    const eventGroupCode =
      typeof body.eventGroupCode === 'string' ? body.eventGroupCode.trim() : '';

    try {
      if (eventGroupCode) {
        const result = await rejectMoreEventGroupCode(strapi, {
          contentType,
          cmsId,
          movieId: body.movieId,
          theaterShowId: body.theaterShowId,
          eventGroupCode,
        });
        ctx.body = {
          ok: true,
          ...result,
          message: `Απορρίφθηκε ${eventGroupCode} για ${result.cmsTitle}`,
          pendingRemaining: (await loadPendingApprovalItems(strapi)).length,
        };
        return;
      }

      await clearCmsPending(strapi, contentType, cmsId);
      ctx.body = {
        ok: true,
        contentType,
        cmsId,
        pendingRemaining: (await loadPendingApprovalItems(strapi)).length,
      };
    } catch (e) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: e?.message || String(e) } };
    }
  },

  async approve(ctx) {
    const body = ctx.request.body ?? {};
    const overwriteExisting = body.overwriteExisting === true;
    const adminEmail = ctx.state?.admin?.email || 'unknown';

    const items = Array.isArray(body.approvals)
      ? body.approvals
      : body.cmsId != null || body.movieId != null || body.theaterShowId != null
        ? [{
            contentType: body.contentType,
            cmsId: body.cmsId,
            movieId: body.movieId,
            theaterShowId: body.theaterShowId,
            eventGroupCode: body.eventGroupCode,
          }]
        : [];

    if (!items.length) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: 'Απαιτείται cmsId ή approvals[]' } };
      return;
    }

    const approved = [];
    const errors = [];

    for (const item of items) {
      try {
        const result = await approveMoreEventGroupCode(strapi, {
          contentType: item.contentType,
          cmsId: item.cmsId,
          movieId: item.movieId,
          theaterShowId: item.theaterShowId,
          eventGroupCode: item.eventGroupCode,
          overwriteExisting,
        });
        approved.push(result);
        strapi.log.info(
          `[more-lookup] ${result.queued ? 'queued' : 'approved'} by ${adminEmail} ${result.contentType} ${result.cmsId} → ${result.eventGroupCode}`,
        );
      } catch (e) {
        errors.push({
          contentType: item.contentType,
          cmsId: item.cmsId ?? item.movieId ?? item.theaterShowId,
          error: e?.message || String(e),
        });
      }
    }

    ctx.body = {
      ok: errors.length === 0,
      approved,
      errors,
      message: `Στην ουρά: ${approved.length}${errors.length ? ` · ${errors.length} σφάλματα` : ''}`,
      pendingRemaining: (await loadPendingApprovalItems(strapi)).length,
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

    const wait = body.wait === true || ctx.query?.wait === 'true';
    const lookupOptions = {
      query: query || null,
      matchCms,
      listAll,
      skipVerify,
      apply,
      overwriteExisting: body.overwriteExisting === true,
    };

    if (wait) {
      if (apply) {
        strapi.log.info(`[more-lookup] blocking apply by ${adminEmail} query=${query || '-'}`);
        try {
          const result = await applyMoreEventCodeMatches(strapi, {
            query: query || null,
            overwriteExisting: body.overwriteExisting === true,
          });
          result.pendingApproval = await loadPendingApprovalItems(strapi);
          ctx.body = result;
        } catch (e) {
          strapi.log.error('[more-lookup] apply failed', e);
          ctx.status = 500;
          ctx.body = { ok: false, error: { message: e?.message || String(e) } };
        }
        return;
      }

      strapi.log.info(`[more-lookup] blocking run by ${adminEmail} matchCms=${matchCms} query=${query || '-'}`);
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
            ? `Ταύτιση: ${result.stats.matched} (ταινίες ${result.stats.cmsMovies} · θέατρο ${result.stats.cmsTheaterShows}) · ${result.stats.pendingApproval} προς έγκριση · κατάλογος: ${result.stats.catalogShown ?? result.catalog?.length ?? 0}`
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
      return;
    }

    const existing = getMoreLookupJob();
    if (existing?.status === 'running') {
      ctx.body = { ok: true, status: 'running', ...existing };
      return;
    }

    strapi.log.info(
      `[more-lookup] background ${apply ? 'apply' : 'run'} by ${adminEmail} matchCms=${matchCms} query=${query || '-'}`,
    );
    const started = startMoreLookupJob(strapi, lookupOptions);
    ctx.body = {
      ok: true,
      status: started.started ? 'started' : 'running',
      ...started.job,
    };
  },

  async runStatus(ctx) {
    ctx.body = { ok: true, ...getMoreLookupJob() };
  },

  async syncShowtimesStatus(ctx) {
    ctx.body = { ok: true, ...getMoreShowtimeSyncJob() };
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
    const theaterShowId = body.theaterShowId ?? ctx.query?.theaterShowId;
    const wait = body.wait === true || ctx.query?.wait === 'true';
    const adminEmail = ctx.state?.admin?.email || 'unknown';

    const syncOptions = {
      movieId: movieId != null && String(movieId).trim() ? Number(movieId) : undefined,
      theaterShowId:
        theaterShowId != null && String(theaterShowId).trim() ? Number(theaterShowId) : undefined,
    };

    if (wait) {
      strapi.log.info(`[more-showtime-sync] blocking run by ${adminEmail}`);
      try {
        const report = await syncShowtimesFromMore(strapi, syncOptions);
        ctx.body = report;
      } catch (e) {
        strapi.log.error('[more-showtime-sync] failed', e);
        ctx.status = 500;
        ctx.body = { ok: false, error: { message: e?.message || String(e) } };
      }
      return;
    }

    const existing = getMoreShowtimeSyncJob();
    if (existing?.status === 'running') {
      ctx.body = { ok: true, status: 'running', ...existing };
      return;
    }

    strapi.log.info(`[more-showtime-sync] background run by ${adminEmail}`);
    const started = startMoreShowtimeSyncJob(strapi, syncOptions);
    ctx.body = {
      ok: true,
      status: started.started ? 'started' : 'running',
      ...started.job,
    };
  },
};
