'use strict';

const {
  runMoreEventCodeLookup,
  applyMoreEventCodeMatches,
} = require('./moreEventCodeLookup');

/** @type {{ id: string, status: string, kind: string, startedAt: string, finishedAt?: string, progress: string, result?: object, error?: string } | null} */
let activeJob = null;

function publicJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    kind: job.kind,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt ?? null,
    progress: job.progress,
    error: job.error ?? null,
    result: job.result ?? null,
  };
}

function getMoreLookupJob() {
  return publicJob(activeJob);
}

function startMoreLookupJob(strapi, options = {}) {
  if (activeJob?.status === 'running') {
    return { started: false, reason: 'already_running', job: publicJob(activeJob) };
  }

  const apply = options.apply === true;
  const id = `lookup-${Date.now()}`;
  activeJob = {
    id,
    status: 'running',
    kind: apply ? 'apply' : 'run',
    startedAt: new Date().toISOString(),
    progress: apply ? 'Έναρξη εγγραφής CMS…' : 'Έναρξη ταύτισης More…',
    result: null,
    error: null,
  };

  const jobRef = activeJob;
  const onProgress = (msg) => {
    if (jobRef.status === 'running' && msg) jobRef.progress = msg;
  };

  (async () => {
    try {
      if (apply) {
        const result = await applyMoreEventCodeMatches(strapi, {
          query: options.query ?? null,
          overwriteExisting: options.overwriteExisting === true,
          onProgress,
        });
        jobRef.result = result;
        jobRef.progress = result.message || 'Ολοκληρώθηκε';
      } else {
        const result = await runMoreEventCodeLookup(strapi, {
          query: options.query ?? null,
          matchCms: options.matchCms !== false,
          listAll: options.listAll === true,
          skipVerify: options.skipVerify === true,
          syncPending: options.matchCms !== false,
          onProgress,
        });
        const message = options.matchCms !== false
          ? `Ταύτιση: ${result.stats.matched} (ταινίες ${result.stats.cmsMovies} · θέατρο ${result.stats.cmsTheaterShows}) · ${result.stats.pendingApproval} προς έγκριση · κατάλογος: ${result.stats.catalogShown ?? result.catalog?.length ?? 0}`
          : `Κατάλογος More: ${result.stats.catalogShown ?? result.catalog?.length ?? 0} εγγραφές`;
        jobRef.result = { ...result, message };
        jobRef.progress = message;
      }
      jobRef.status = 'completed';
      jobRef.finishedAt = new Date().toISOString();
      strapi.log.info(`[more-lookup] job ${id} (${jobRef.kind}) completed`);
    } catch (e) {
      const msg = e?.message || String(e);
      jobRef.status = 'failed';
      jobRef.error = msg;
      jobRef.finishedAt = new Date().toISOString();
      jobRef.progress = `Αποτυχία: ${msg}`;
      strapi.log.error(`[more-lookup] job ${id} failed`, e);
    }
  })();

  return { started: true, job: publicJob(activeJob) };
}

module.exports = {
  getMoreLookupJob,
  startMoreLookupJob,
};
