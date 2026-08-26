'use strict';

const {
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
  rejectMoreEventGroupCode,
  linkMoreCodeToCms,
  createVenueFromMoreCatalog,
  createCmsContentFromMoreCatalog,
  DEFAULT_MIN_SCORE,
  DEFAULT_APPLY_MIN_SCORE,
} = require('../../../utils/moreEventCodeLookup');
const { syncShowtimesFromMore } = require('../../../utils/moreShowtimeSync');
const { linkEventIdsManually } = require('../../../utils/moreEventIdPersist');
const {
  getMoreShowtimeSyncJob,
  startMoreShowtimeSyncJob,
  resetStuckMoreShowtimeSyncJob,
} = require('../../../utils/moreShowtimeSyncJob');
const {
  getMoreLookupJob,
  startMoreLookupJob,
} = require('../../../utils/moreLookupJob');
const { getMoreProxyStatus } = require('../../../utils/moreHttp');

module.exports = {
  async status(ctx) {
    ctx.body = {
      enabled: process.env.MORE_LOOKUP_ENABLED !== 'false',
      showtimeSyncEnabled: process.env.MORE_SHOWTIME_SYNC_ENABLED !== 'false',
      // Χωρίς resume — αλλιώς κάθε άνοιγμα admin μπορεί να spawn-άρει sync worker και να πνίξει την ταύτιση.
      showtimeSyncJob: getMoreShowtimeSyncJob(strapi, { allowResume: false }),
      lookupJob: getMoreLookupJob(),
      moreProxy: getMoreProxyStatus(),
      minScore: DEFAULT_MIN_SCORE,
      applyMinScore: DEFAULT_APPLY_MIN_SCORE,
    };
  },

  async reject(ctx) {
    const body = ctx.request.body ?? {};

    const items = Array.isArray(body.rejections)
      ? body.rejections
      : body.cmsId != null || body.movieId != null || body.theaterShowId != null || body.venueId != null
        ? [{
            contentType: body.contentType,
            cmsId: body.cmsId,
            movieId: body.movieId,
            theaterShowId: body.theaterShowId,
            venueId: body.venueId,
            eventGroupCode: body.eventGroupCode,
          }]
        : [];

    if (!items.length) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: 'Απαιτείται cmsId + eventGroupCode ή rejections[]' } };
      return;
    }

    const rejected = [];
    const errors = [];

    for (const item of items) {
      const contentType =
        item.contentType ||
        (item.venueId != null ? 'venue' : item.theaterShowId != null ? 'theater_show' : 'movie');
      const cmsId = Number(item.cmsId ?? item.movieId ?? item.theaterShowId ?? item.venueId);
      if (!Number.isFinite(cmsId)) {
        errors.push({ contentType, cmsId: item.cmsId, error: 'Άκυρο cmsId' });
        continue;
      }

      const eventGroupCode =
        typeof item.eventGroupCode === 'string' ? item.eventGroupCode.trim() : '';

      if (!eventGroupCode) {
        errors.push({ contentType, cmsId, error: 'Απαιτείται eventGroupCode' });
        continue;
      }

      try {
        const result = await rejectMoreEventGroupCode(strapi, {
          contentType,
          cmsId,
          movieId: item.movieId,
          theaterShowId: item.theaterShowId,
          venueId: item.venueId,
          eventGroupCode,
        });
        rejected.push(result);
      } catch (e) {
        errors.push({
          contentType,
          cmsId,
          eventGroupCode,
          error: e?.message || String(e),
        });
      }
    }

    ctx.body = {
      ok: errors.length === 0,
      rejected,
      errors,
      message:
        rejected.length > 0
          ? `Απορρίφθηκαν ${rejected.length}${errors.length ? ` · ${errors.length} σφάλματα` : ''}`
          : errors.length
            ? `Αποτυχία απόρριψης (${errors.length})`
            : 'Δεν υπάρχουν εγγραφές προς απόρριψη',
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

      strapi.log.info(`[more-lookup] blocking run by ${adminEmail} matchCms=${matchCms} query=${query || '-'}`);
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
            ? `Ταύτιση: ${result.stats.matched} (ταινίες ${result.stats.cmsMovies} · θέατρο ${result.stats.cmsTheaterShows}) · κατάλογος: ${result.stats.catalogShown ?? result.catalog?.length ?? 0}`
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
    // Poll: ποτέ spawn worker — μόνο ανάγνωση κατάστασης (resume γίνεται στο bootstrap / start).
    ctx.body = {
      ok: true,
      ...getMoreShowtimeSyncJob(strapi, { forStatusPoll: true, allowResume: false }),
    };
  },

  async cmsSearch(ctx) {
    const q = String(ctx.query?.q || '').trim();
    const contentType =
      ctx.query?.contentType === 'theater_show' ? 'theater_show' : 'movie';
    const limit = Math.min(50, Math.max(1, Number(ctx.query?.limit) || 36));
    const uid =
      contentType === 'theater_show'
        ? 'api::theater-show.theater-show'
        : 'api::movie.movie';

    const filters = q
      ? contentType === 'movie'
        ? {
            $or: [
              { title: { $containsi: q } },
              { original_title: { $containsi: q } },
            ],
          }
        : { title: { $containsi: q } }
      : {};

    const fields =
      contentType === 'movie'
        ? ['id', 'title', 'original_title', 'slug']
        : ['id', 'title', 'slug'];

    const rows = await strapi.entityService.findMany(uid, {
      filters,
      fields,
      publicationState: 'preview',
      sort: { title: 'asc' },
      pagination: { page: 1, pageSize: limit },
    });

    ctx.body = {
      ok: true,
      contentType,
      items: (Array.isArray(rows) ? rows : []).map((row) => ({
        id: row.id,
        title: row.title || `#${row.id}`,
        originalTitle: row.original_title || '',
        contentType,
      })),
    };
  },

  async syncShowtimesReset(ctx) {
    const cleared = resetStuckMoreShowtimeSyncJob('Ακυρώθηκε χειροκίνητα (reset).');
    ctx.body = {
      ok: true,
      cleared: Boolean(cleared),
      job: getMoreShowtimeSyncJob(strapi),
    };
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
    const venueId = body.venueId ?? ctx.query?.venueId;
    const wait = body.wait === true || ctx.query?.wait === 'true';
    const adminEmail = ctx.state?.admin?.email || 'unknown';

    const rawScope = body.scope ?? ctx.query?.scope;
    let scope = rawScope === 'cinema' || rawScope === 'theater' ? rawScope : 'all';
    if (venueId != null && String(venueId).trim()) scope = 'cinema';

    const syncOptions = {
      movieId: movieId != null && String(movieId).trim() ? Number(movieId) : undefined,
      theaterShowId:
        theaterShowId != null && String(theaterShowId).trim() ? Number(theaterShowId) : undefined,
      venueId: venueId != null && String(venueId).trim() ? Number(venueId) : undefined,
      scope,
      force: body.force === true,
    };

    if (wait && process.env.MORE_SHOWTIME_SYNC_ALLOW_WAIT !== 'true') {
      ctx.status = 400;
      ctx.body = {
        ok: false,
        error: {
          message:
            'wait=true απενεργοποιημένο (κινδυνεύει με timeout HTTP). Χρησιμοποίησε async job χωρίς wait, ή MORE_SHOWTIME_SYNC_ALLOW_WAIT=true.',
        },
      };
      return;
    }

    if (wait) {
      strapi.log.info(
        `[more-showtime-sync] blocking run by ${adminEmail}` +
          (syncOptions.venueId ? ` venueId=${syncOptions.venueId}` : ''),
      );
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

    const existing = getMoreShowtimeSyncJob(strapi);
    if (existing?.status === 'running' && !syncOptions.force) {
      ctx.body = { ok: true, status: 'running', ...existing };
      return;
    }

    strapi.log.info(
      `[more-showtime-sync] background run by ${adminEmail} scope=${scope}` +
        (syncOptions.venueId ? ` venueId=${syncOptions.venueId}` : '') +
        `${syncOptions.force ? ' (force)' : ''}`,
    );
    const started = startMoreShowtimeSyncJob(strapi, syncOptions);
    ctx.body = {
      ok: true,
      status: started.started ? 'started' : started.reason || 'running',
      reason: started.reason ?? null,
      ...started.job,
    };
  },

  async link(ctx) {
    const body = ctx.request.body ?? {};
    const adminEmail = ctx.state?.admin?.email || 'unknown';

    try {
      const result = await linkMoreCodeToCms(strapi, {
        contentType: body.contentType,
        cmsId: body.cmsId,
        movieId: body.movieId,
        theaterShowId: body.theaterShowId,
        venueId: body.venueId,
        eventGroupCode: body.eventGroupCode,
        catalogKind: body.catalogKind,
        moreTitle: body.moreTitle,
        overwriteExisting: body.overwriteExisting === true,
      });
      strapi.log.info(
        `[more-lookup] link by ${adminEmail} ${result.contentType} ${result.cmsId} → ${result.eventGroupCode}`,
      );
      ctx.body = {
        ...result,
        message:
          result.message ||
          (result.alreadyLinked
            ? `Ο κωδικός ${result.eventGroupCode} υπάρχει ήδη στο CMS`
            : `Γράφτηκε ${result.eventGroupCode} στο more_event_groups (#${result.cmsId})`),
      };
    } catch (e) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: e?.message || String(e) } };
    }
  },

  /**
   * Χειροκίνητη ταύτιση τίτλου από sync report:
   * - eventIds + playTitle (+ play:id) → more_event_ids (alias για επόμενα sync)
   * - μόνο πραγματικός evg_* playId → more_event_groups
   */
  async linkUnmatched(ctx) {
    const body = ctx.request.body ?? {};
    const adminEmail = ctx.state?.admin?.email || 'unknown';
    const contentType = body.contentType === 'theater_show' ? 'theater_show' : 'movie';
    const cmsId = Number(body.cmsId ?? body.movieId ?? body.theaterShowId);
    const playTitle = String(body.playTitle || body.moreTitle || '').trim();
    const eventIds = Array.isArray(body.eventIds)
      ? body.eventIds
      : body.eventId
        ? [body.eventId]
        : [];
    const playId = String(body.playId || body.eventGroupCode || '').trim();
    const isEventGroupCode = /^evg_/i.test(playId);

    try {
      const parts = [];
      let eventLink = null;
      // Πάντα more_event_ids όταν έχουμε eventIds / μη-evg playId / τίτλο (σταθερό alias).
      if (eventIds.length || (playId && !isEventGroupCode) || playTitle) {
        eventLink = await linkEventIdsManually(strapi, {
          contentType,
          cmsId,
          eventIds,
          playId: isEventGroupCode ? '' : playId,
          playTitle,
        });
        if (!eventLink.ok) {
          ctx.status = 400;
          ctx.body = { ok: false, error: { message: eventLink.error || 'Αποτυχία σύνδεσης eventId' } };
          return;
        }
        parts.push(eventLink.message);
      }

      let groupLink = null;
      if (isEventGroupCode) {
        groupLink = await linkMoreCodeToCms(strapi, {
          contentType,
          cmsId,
          movieId: contentType === 'movie' ? cmsId : undefined,
          theaterShowId: contentType === 'theater_show' ? cmsId : undefined,
          eventGroupCode: playId,
          catalogKind: contentType === 'theater_show' ? 'show' : 'movie',
          moreTitle: playTitle,
        });
        parts.push(groupLink.message || `more_event_groups ← ${playId}`);
      }

      if (!eventLink && !groupLink) {
        ctx.status = 400;
        ctx.body = {
          ok: false,
          error: { message: 'Απαιτείται eventId, playId ή playTitle για σύνδεση' },
        };
        return;
      }

      strapi.log.info(
        `[more-lookup] link-unmatched by ${adminEmail} ${contentType} #${cmsId}` +
          ` eventIds=${eventIds.join(',') || '—'} playId=${playId || '—'}` +
          (isEventGroupCode ? ' (evg→more_event_groups)' : ' (alias→more_event_ids)'),
      );

      ctx.body = {
        ok: true,
        contentType,
        cmsId,
        cmsTitle: eventLink?.cmsTitle,
        eventIds: eventLink?.eventIds || [],
        playId: playId || null,
        eventLink,
        groupLink,
        message: parts.filter(Boolean).join(' · '),
      };
    } catch (e) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: e?.message || String(e) } };
    }
  },

  async createVenue(ctx) {
    const body = ctx.request.body ?? {};
    const adminEmail = ctx.state?.admin?.email || 'unknown';

    try {
      const result = await createVenueFromMoreCatalog(strapi, {
        eventGroupCode: body.eventGroupCode,
        name: body.name,
        type: body.type,
        venueId: body.venueId,
        moreTitle: body.moreTitle,
        moreUrl: body.moreUrl,
        category: body.category,
        catalogKind: body.catalogKind,
        verify: body.verify,
        publish: body.publish === true,
      });
      strapi.log.info(
        `[more-lookup] create-venue by ${adminEmail} ${result.venue.name} (#${result.venue.id}) → ${body.eventGroupCode}`,
      );
      ctx.body = {
        ...result,
        message: `Δημιουργήθηκε draft χώρος «${result.venue.name}» (#${result.venue.id}) με event_group_code`,
      };
    } catch (e) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: e?.message || String(e) } };
    }
  },

  async createContent(ctx) {
    const body = ctx.request.body ?? {};
    const adminEmail = ctx.state?.admin?.email || 'unknown';

    try {
      const result = await createCmsContentFromMoreCatalog(strapi, {
        eventGroupCode: body.eventGroupCode,
        kind: body.kind,
        catalogKind: body.catalogKind,
        category: body.category,
        title: body.title,
        moreTitle: body.moreTitle,
        moreUrl: body.moreUrl,
        originalTitle: body.originalTitle,
      });
      strapi.log.info(
        `[more-lookup] create-content by ${adminEmail} ${result.contentType} #${result.entry.id} → ${body.eventGroupCode}`,
      );
      ctx.body = result;
    } catch (e) {
      ctx.status = 400;
      ctx.body = { ok: false, error: { message: e?.message || String(e) } };
    }
  },
};
