'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { syncShowtimesFromMore, combineSyncReports } = require('./moreShowtimeSync');

const JOB_FILE = path.join(process.cwd(), 'data', 'more-showtime-sync-job.json');
const WORKER_LOG = path.join(process.cwd(), 'data', 'more-showtime-sync-worker.log');
const STALE_MS = Number(process.env.MORE_SHOWTIME_SYNC_STALE_MS || 20 * 60 * 1000);
const HEARTBEAT_MS = 30_000;
const START_DELAY_MS = Number(process.env.MORE_SHOWTIME_SYNC_START_DELAY_MS || 2500);
/** Χάρις πριν θεωρήσουμε ότι ο worker δεν ξεκίνησε (spawn + Strapi boot). */
const WORKER_BOOT_GRACE_MS = Number(process.env.MORE_SHOWTIME_SYNC_BOOT_GRACE_MS || 180_000);
const MAX_PERSISTED_ERRORS = Number(process.env.MORE_SHOWTIME_SYNC_MAX_PERSISTED_ERRORS || 200);
/** Worker (default): ξεχωριστή διεργασία — το admin/API μένει ζωντανό. In-process: MORE_SHOWTIME_SYNC_IN_PROCESS=true */
const USE_WORKER = process.env.MORE_SHOWTIME_SYNC_IN_PROCESS !== 'true';

/** @type {object | null} */
let activeJob = null;

function ensureJobDir() {
  const dir = path.dirname(JOB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendWorkerLog(line) {
  try {
    ensureJobDir();
    fs.appendFileSync(WORKER_LOG, line.endsWith('\n') ? line : `${line}\n`);
  } catch (e) {
    console.error('[more-showtime-sync] worker log write failed', e?.message || e);
  }
}

function readWorkerLogTail(maxBytes = 12_000) {
  try {
    if (!fs.existsSync(WORKER_LOG)) return '';
    const stat = fs.statSync(WORKER_LOG);
    if (stat.size <= 0) return '';
    const start = Math.max(0, stat.size - maxBytes);
    const fd = fs.openSync(WORKER_LOG, 'r');
    const buf = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

function workerLogShowsRecentActivity(maxAgeMs = 300_000) {
  try {
    if (fs.existsSync(WORKER_LOG)) {
      const stat = fs.statSync(WORKER_LOG);
      if (Date.now() - stat.mtimeMs < maxAgeMs) {
        const tail = readWorkerLogTail(4000);
        if (/\[sync-worker\]|\[parent\]/i.test(tail)) return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function hasRecentWorkerProgress(job, maxAgeMs = 300_000) {
  if (!job?.lastProgressAt) return false;
  const age = Date.now() - new Date(job.lastProgressAt).getTime();
  if (age > maxAgeMs) return false;
  const p = String(job.progress || '');
  return /Worker:/i.test(p) || /worker/i.test(p) || /συγχρονισμός More/i.test(p);
}

function workerEnvForSpawn() {
  const env = { ...process.env, MORE_SHOWTIME_SYNC_WORKER: '1' };
  // Το parent έχει NODE_OPTIONS=--max-old-space-size=1024· ο worker παίρνει heap από CLI args.
  delete env.NODE_OPTIONS;
  return env;
}

function preflightSpawnWorker(jobId) {
  ensureJobDir();
  const script = path.join(process.cwd(), 'scripts', 'sync-showtimes-worker.js');
  if (!fs.existsSync(script)) {
    throw new Error(`Δεν βρέθηκε το script worker: ${script}`);
  }
  try {
    fs.accessSync(path.dirname(JOB_FILE), fs.constants.W_OK);
    appendWorkerLog(`[parent] preflight ok job=${jobId} script=${script}\n`);
  } catch (e) {
    throw new Error(
      `Ο φάκελος data/ δεν είναι εγγράψιμος (${path.dirname(JOB_FILE)}): ${e?.message || e}`,
    );
  }
  return script;
}

function publicJob(job) {
  if (!job) return null;
  const phases = Array.isArray(job.phases) ? job.phases : null;
  const phaseIndex = job.phaseIndex != null ? job.phaseIndex : null;
  return {
    id: job.id,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt ?? null,
    progress: job.progress,
    error: job.error ?? null,
    report: resolvePublicReport(job),
    lastProgressAt: job.lastProgressAt ?? null,
    workerPid: job.workerPid ?? null,
    scope: job.scope ?? null,
    phases,
    phaseIndex,
    currentPhase: phases && phaseIndex != null ? phases[phaseIndex] ?? null : null,
    totalPhases: phases ? phases.length : null,
    hasPhaseReports: Boolean(
      job.phaseReports && Object.keys(job.phaseReports).length > 0,
    ),
  };
}

function trimReportForDisk(report) {
  if (!report || typeof report !== 'object') return report;
  const errors = Array.isArray(report.errors) ? report.errors : null;
  if (!errors || errors.length <= MAX_PERSISTED_ERRORS) return report;
  return {
    ...report,
    errors: errors.slice(0, MAX_PERSISTED_ERRORS),
    errorsTruncated: errors.length - MAX_PERSISTED_ERRORS,
  };
}

/** Μικρή αναφορά για job file — τα byMovie/byVenue μπορεί να φτάσουν MB και να σπάνε το persist. */
function slimReportForDisk(report) {
  const trimmed = trimReportForDisk(report);
  if (!trimmed || typeof trimmed !== 'object') return trimmed;
  const {
    byMovie,
    byVenue,
    byTheaterShow,
    byTheaterVenue,
    missingVenueIds,
    missingCinemaVenueIds,
    missingTheaterVenueIds,
    createdCinemaVenuesList,
    createdTheaterVenuesList,
    eventIdIndex,
    phaseReports,
    ...summary
  } = trimmed;
  return {
    ...summary,
    byMovieCount: Array.isArray(byMovie) ? byMovie.length : 0,
    byVenueCount: Array.isArray(byVenue) ? byVenue.length : 0,
    byTheaterShowCount: Array.isArray(byTheaterShow) ? byTheaterShow.length : 0,
    byTheaterVenueCount: Array.isArray(byTheaterVenue) ? byTheaterVenue.length : 0,
    missingVenueIdsCount: Array.isArray(missingVenueIds) ? missingVenueIds.length : 0,
    detailsOmitted: true,
  };
}

function resolvePublicReport(job) {
  if (job?.report) return job.report;
  if (job?.phaseReports && typeof job.phaseReports === 'object') {
    const parts = Object.values(job.phaseReports).filter(Boolean);
    if (parts.length) return combineSyncReports(parts);
  }
  return null;
}

function jobForDisk(job) {
  const pub = publicJob(job);
  if (job?.workerOptions) pub.workerOptions = job.workerOptions;
  const resolvedReport = job.report || resolvePublicReport(job);
  if (resolvedReport) pub.report = slimReportForDisk(resolvedReport);
  if (job?.phaseTransitionAt) pub.phaseTransitionAt = job.phaseTransitionAt;
  if (job?.phaseReports && typeof job.phaseReports === 'object') {
    const trimmed = {};
    for (const [k, v] of Object.entries(job.phaseReports)) trimmed[k] = slimReportForDisk(v);
    pub.phaseReports = trimmed;
  }
  return pub;
}

function persistJob(job) {
  if (!job) return false;
  try {
    ensureJobDir();
    const payload = JSON.stringify(jobForDisk(job));
    fs.writeFileSync(JOB_FILE, payload);
    return true;
  } catch (e) {
    console.error('[more-showtime-sync] persist job failed', e?.message || e);
    return false;
  }
}

function loadPersistedJob() {
  try {
    if (!fs.existsSync(JOB_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(JOB_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return raw;
  } catch {
    return null;
  }
}

function loadFullJobFromDisk() {
  try {
    if (!fs.existsSync(JOB_FILE)) return null;
    return JSON.parse(fs.readFileSync(JOB_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

function markInterruptedIfNeeded(saved) {
  if (saved?.status !== 'running') return saved;
  if (isProcessAlive(saved.workerPid)) {
    return saved;
  }
  return {
    ...saved,
    status: 'failed',
    error:
      'Το sync διακόπηκε (επανεκκίνηση Strapi ή crash worker). Τρέξε ξανά sync.',
    finishedAt: new Date().toISOString(),
    progress: 'Διακόπηκε',
  };
}

function initJobStateFromDisk() {
  const saved = loadPersistedJob();
  if (!saved) return;
  const recovered = markInterruptedIfNeeded(saved);
  activeJob = recovered;
  if (recovered !== saved) persistJob(recovered);
}

initJobStateFromDisk();

function isJobStale(job) {
  if (!job || job.status !== 'running') return false;
  const ref = job.lastProgressAt || job.startedAt;
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() > STALE_MS;
}

function failJob(jobRef, error) {
  const patch = {
    status: 'failed',
    error,
    finishedAt: new Date().toISOString(),
    progress: error,
    workerPid: null,
  };
  Object.assign(jobRef, patch);
  persistJob(jobRef);
  return publicJob(jobRef);
}

function failJobById(jobId, error) {
  const current = loadFullJobFromDisk();
  if (!current || current.id !== jobId) {
    if (activeJob?.id === jobId) return failJob(activeJob, error);
    return null;
  }
  activeJob = current;
  return failJob(current, error);
}

/** Μαρκάρει κολλημένο/ζombie job ώστε να επιτρέπεται νέο sync. */
function resetStuckMoreShowtimeSyncJob(reason) {
  const job = activeJob || loadPersistedJob();
  if (!job || job.status !== 'running') return null;
  const msg =
    reason ||
    'Το sync διακόπηκε (502/restart). Τρέξε ξανά — η προηγούμενη εργασία ακυρώθηκε.';
  if (activeJob) return failJob(activeJob, msg);
  const failed = {
    ...job,
    status: 'failed',
    error: msg,
    finishedAt: new Date().toISOString(),
    progress: msg,
  };
  activeJob = failed;
  persistJob(failed);
  return publicJob(failed);
}

/** @type {number} */
let lastWorkerResumeAt = 0;
const WORKER_RESUME_DEBOUNCE_MS = 15_000;
const WORKER_RESUME_MIN_AGE_MS = Number(process.env.MORE_SHOWTIME_SYNC_RESUME_MIN_MS || 8000);

function jobNeedsWorkerResume(job) {
  if (!USE_WORKER || !job || job.status !== 'running') return false;
  if (job.workerPid && isProcessAlive(job.workerPid)) return false;
  const graceRef = job.phaseTransitionAt || job.startedAt;
  const graceAgeMs = graceRef ? Date.now() - new Date(graceRef).getTime() : Infinity;
  return graceAgeMs >= START_DELAY_MS + WORKER_RESUME_MIN_AGE_MS;
}

function resumeOrphanedSyncWorker(strapi) {
  const job = loadFullJobFromDisk();
  if (!jobNeedsWorkerResume(job)) return false;
  const now = Date.now();
  if (now - lastWorkerResumeAt < WORKER_RESUME_DEBOUNCE_MS) return false;
  lastWorkerResumeAt = now;
  try {
    spawnSyncWorker(strapi, job.id);
    patchJobOnDisk(job.id, {
      progress: `${job.progress || 'Sync'} · worker ξανα-ξεκίνησε (resume)`,
      lastProgressAt: new Date().toISOString(),
    });
    if (strapi?.log) {
      strapi.log.warn(`[more-showtime-sync] resumed orphaned worker job=${job.id} phase=${job.phaseIndex}`);
    } else {
      console.warn(`[more-showtime-sync] resumed orphaned worker job=${job.id}`);
    }
    return true;
  } catch (e) {
    failJobById(
      job.id,
      e?.message || 'Αποτυχία επανεκκίνησης worker μετά από restart. Τρέξε ξανά sync.',
    );
    return false;
  }
}

function recoverDeadWorkerJob(job, strapi) {
  if (!job || job.status !== 'running' || !USE_WORKER) return job;

  const pid = job.workerPid;
  if (pid && isProcessAlive(pid)) return job;

  const graceRef = job.phaseTransitionAt || job.startedAt;
  const graceAgeMs = graceRef ? Date.now() - new Date(graceRef).getTime() : Infinity;
  if (graceAgeMs < START_DELAY_MS + WORKER_BOOT_GRACE_MS) {
    if (strapi && jobNeedsWorkerResume(job)) resumeOrphanedSyncWorker(strapi);
    return publicJob(loadFullJobFromDisk()) || job;
  }

  if (strapi && jobNeedsWorkerResume(job)) {
    resumeOrphanedSyncWorker(strapi);
    const refreshed = loadFullJobFromDisk();
    if (refreshed?.workerPid && isProcessAlive(refreshed.workerPid)) {
      return publicJob(refreshed);
    }
  }

  const diskJob = loadFullJobFromDisk();
  const activityJob = diskJob?.id === job.id ? diskJob : job;
  if (
    workerLogShowsRecentActivity(WORKER_BOOT_GRACE_MS + 60_000) ||
    hasRecentWorkerProgress(activityJob, WORKER_BOOT_GRACE_MS + 60_000)
  ) {
    if (strapi) resumeOrphanedSyncWorker(strapi);
    return publicJob(loadFullJobFromDisk()) || job;
  }

  const logTail = readWorkerLogTail(2000).trim();
  const logHint = logTail
    ? ` Τελευταίες γραμμές log: ${logTail.slice(-400).replace(/\s+/g, ' ')}`
    : ' Το αρχείο log είναι κενό ή δεν δημιουργήθηκε.';

  const msg = pid
    ? 'Ο worker διακόπηκε (crash/OOM). Δες data/more-showtime-sync-worker.log και τρέξε ξανά sync.'
    : `Ο worker δεν ξεκίνησε εγκαίρως. Δες data/more-showtime-sync-worker.log (spawn/permissions).${logHint}`;

  if (activeJob?.id === job.id) return failJob(activeJob, msg);
  const failed = {
    ...job,
    status: 'failed',
    error: msg,
    finishedAt: new Date().toISOString(),
    progress: msg,
    workerPid: null,
  };
  activeJob = failed;
  persistJob(failed);
  return publicJob(failed);
}

function getMoreShowtimeSyncJob(strapi) {
  const disk = loadPersistedJob();
  if (disk) {
    activeJob = disk;
  }
  if (strapi) resumeOrphanedSyncWorker(strapi);
  let job = disk ? publicJob(disk) : activeJob ? publicJob(activeJob) : null;
  job = recoverDeadWorkerJob(job, strapi);
  if (isJobStale(job)) {
    return resetStuckMoreShowtimeSyncJob(
      'Το sync κόλλησε χωρίς πρόοδο — ακυρώθηκε. Τρέξε ξανά (worker + χαμηλό concurrency).',
    );
  }
  return job;
}

function isMoreShowtimeSyncRunning() {
  const job = getMoreShowtimeSyncJob();
  return job?.status === 'running';
}

function touchJobProgress(jobRef, msg) {
  const now = new Date().toISOString();
  jobRef.lastProgressAt = now;
  if (msg) jobRef.progress = msg;
  persistJob(jobRef);
}

function patchJobOnDisk(jobId, patch) {
  const current = loadFullJobFromDisk();
  if (!current || current.id !== jobId) {
    if (current?.id && current.id !== jobId) {
      console.warn(
        `[more-showtime-sync] patch ignored job=${jobId} (disk has ${current.id}, status=${current.status})`,
      );
    }
    return null;
  }
  Object.assign(current, patch);
  activeJob = current;
  if (!persistJob(current)) {
    console.error(`[more-showtime-sync] patch persist failed job=${jobId}`);
    return null;
  }
  return current;
}

function completeJobById(jobId, report, extraPatch = {}) {
  const slim = slimReportForDisk(report);
  let patched = patchJobOnDisk(jobId, {
    status: 'completed',
    report: slim,
    finishedAt: new Date().toISOString(),
    progress: slim?.message || report?.message || 'Ολοκληρώθηκε',
    error: null,
    workerPid: null,
    ...extraPatch,
  });
  if (patched) return patched;

  const minimal = {
    ok: true,
    message: report?.message || 'Ολοκληρώθηκε',
    created: report?.created ?? 0,
    createdFromMovies: report?.createdFromMovies ?? 0,
    createdFromVenues: report?.createdFromVenues ?? 0,
    createdFromTheaterShows: report?.createdFromTheaterShows ?? 0,
    createdFromTheaterVenues: report?.createdFromTheaterVenues ?? 0,
    alreadyExists: report?.alreadyExists ?? 0,
    durationMs: report?.durationMs,
    detailsOmitted: true,
  };
  patched = patchJobOnDisk(jobId, {
    status: 'completed',
    report: minimal,
    finishedAt: new Date().toISOString(),
    progress: minimal.message,
    error: null,
    workerPid: null,
    ...extraPatch,
  });
  if (!patched) {
    failJobById(
      jobId,
      'Το sync ολοκληρώθηκε αλλά η αναφορά δεν αποθηκεύτηκε (disk). Δες data/more-showtime-sync-worker.log.',
    );
  }
  return patched;
}

function patchWorkerPidWithRetry(jobId, pid, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    const patched = patchJobOnDisk(jobId, { workerPid: pid ?? null });
    if (patched) return patched;
    if (i < attempts - 1) {
      const waitUntil = Date.now() + 50 * (i + 1);
      while (Date.now() < waitUntil) {
        // σύντομη αναμονή πριν επανάληψη (race με άλλο patch από worker)
      }
    }
  }
  appendWorkerLog(
    `[parent] WARN: could not persist workerPid=${pid ?? 'null'} job=${jobId} after ${attempts} tries\n`,
  );
  return null;
}

function spawnSyncWorker(strapi, jobId) {
  const script = preflightSpawnWorker(jobId);
  const heapMb = String(process.env.MORE_SHOWTIME_SYNC_WORKER_HEAP || '2560').replace(/\D/g, '') || '2560';
  const startedAt = new Date().toISOString();
  appendWorkerLog(
    `[parent] spawn ${startedAt} job=${jobId} heap=${heapMb}MB exec=${process.execPath}\n`,
  );

  let logFd;
  try {
    logFd = fs.openSync(WORKER_LOG, 'a');
  } catch (e) {
    throw new Error(
      `Δεν ανοίγει το log ${WORKER_LOG}: ${e?.message || e}. Έλεγξε permissions στο volume data/.`,
    );
  }

  // --expose-gc ως ΑΜΕΣΟ CLI arg (επιτρέπεται· μόνο το NODE_OPTIONS απαγορεύει το flag) →
  // ενεργοποιεί το maybeGc() ανάμεσα στα batches ώστε να αποδεσμεύεται μνήμη μέσα στο run.
  const child = spawn(
    process.execPath,
    [`--max-old-space-size=${heapMb}`, '--expose-gc', script, jobId],
    {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: workerEnvForSpawn(),
    },
  );

  child.on('error', (err) => {
    appendWorkerLog(
      `[parent] spawn error job=${jobId}: ${err?.message || err} code=${err?.code || '?'}\n`,
    );
    failJobById(
      jobId,
      `Αποτυχία spawn worker: ${err?.message || err}. Έλεγξε RAM, ${script} και permissions στο data/.`,
    );
  });

  child.on('exit', (code, signal) => {
    setTimeout(() => {
      const job = loadFullJobFromDisk();
      if (!job || job.id !== jobId || job.status !== 'running') return;
      if (job.workerPid && child.pid && job.workerPid !== child.pid) return;

      if (code === 0) {
        // Chained «Όλα»: ο worker ολοκλήρωσε μια φάση κι αύξησε το phaseIndex.
        // Αν υπάρχει επόμενη φάση, ξεκινάμε νέο (καθαρό heap) worker process.
        const phases = Array.isArray(job.phases) ? job.phases : [];
        if (job.phaseIndex != null && job.phaseIndex < phases.length) {
          try {
            spawnSyncWorker(strapi, jobId);
          } catch (e) {
            failJobById(
              jobId,
              e?.message || 'Αποτυχία εκκίνησης επόμενης φάσης sync. Δες data/more-showtime-sync-worker.log.',
            );
          }
          return;
        }
        failJobById(
          jobId,
          'Ο worker τερμάτισε χωρίς να σημειώσει ολοκλήρωση. Δες data/more-showtime-sync-worker.log.',
        );
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      failJobById(
        jobId,
        `Ο worker τερμάτισε (${detail}). Πιθανό OOM — αύξησε MORE_SHOWTIME_SYNC_WORKER_HEAP. Δες data/more-showtime-sync-worker.log.`,
      );
    }, 2500);
  });

  child.unref();

  const pid = child.pid ?? null;
  appendWorkerLog(`[parent] spawned pid=${pid ?? 'null'} job=${jobId}\n`);
  if (!pid) {
    throw new Error('Το spawn δεν επέστρεψε pid — πιθανό πρόβλημα permissions ή έλλειψη RAM.');
  }
  patchWorkerPidWithRetry(jobId, pid);
  const log = strapi?.log || console;
  log.info(`[more-showtime-sync] worker spawned pid=${pid} job=${jobId} heap=${heapMb}MB`);
  return pid;
}

/**
 * Εκτέλεση sync μέσα στο worker process (φορτώνει δικό του Strapi instance).
 * @param {string} jobId
 */
async function runMoreShowtimeSyncWorker(jobId) {
  const saved = loadFullJobFromDisk();
  if (!saved || saved.id !== jobId) {
    console.error(`[sync-worker] Άγνωστο job ${jobId}`);
    process.exit(1);
  }
  if (saved.status !== 'running') {
    console.error(`[sync-worker] Job ${jobId} status=${saved.status} — skip`);
    process.exit(0);
  }

  const workerOptions = saved.workerOptions || {};
  const phases = Array.isArray(saved.phases) && saved.phases.length ? saved.phases : ['cinema', 'theater'];
  const phaseIndex = Number.isInteger(saved.phaseIndex) ? saved.phaseIndex : 0;
  const phase = phases[phaseIndex] || 'all';
  const isLastPhase = phaseIndex >= phases.length - 1;
  const phaseLabel = phase === 'cinema' ? 'σινεμά' : phase === 'theater' ? 'θέατρο' : 'όλα';
  let strapi;

  const onProgress = (msg) => {
    if (!msg) return;
    const prefix = phases.length > 1 ? `[${phaseIndex + 1}/${phases.length} ${phaseLabel}] ` : '';
    patchJobOnDisk(jobId, {
      status: 'running',
      lastProgressAt: new Date().toISOString(),
      progress: `${prefix}${msg}`,
    });
  };

  try {
    console.log(`[sync-worker] boot Strapi job=${jobId} phase=${phase} (${phaseIndex + 1}/${phases.length})`);
    onProgress('Worker: εκκίνηση Strapi…');
    const Strapi = require('@strapi/strapi');
    strapi = await Strapi().load();
    onProgress('Worker: συγχρονισμός More…');

    const report = await syncShowtimesFromMore(strapi, {
      ...workerOptions,
      scope: phase,
      onProgress,
    });

    const current = loadFullJobFromDisk();
    const phaseReports = { ...(current?.phaseReports || {}), [phase]: report };

    if (isLastPhase) {
      const ordered = phases.map((p) => phaseReports[p]).filter(Boolean);
      const finalReport = phases.length > 1 ? combineSyncReports(ordered) : report;
      const patched = completeJobById(jobId, finalReport, { phaseReports });
      if (!patched) {
        console.error(
          `[sync-worker] completed but job file changed or persist failed (job=${jobId}).`,
        );
        process.exitCode = 1;
      } else {
        console.log(`[sync-worker] completed job=${jobId} phase=${phase} (${report.durationMs}ms)`);
      }
    } else {
      // Ολοκληρώθηκε ενδιάμεση φάση — ο parent ξεκινά την επόμενη με καθαρό heap.
      const patched = patchJobOnDisk(jobId, {
        status: 'running',
        phaseReports: Object.fromEntries(
          Object.entries(phaseReports).map(([k, v]) => [k, slimReportForDisk(v)]),
        ),
        phaseIndex: phaseIndex + 1,
        phaseTransitionAt: new Date().toISOString(),
        lastProgressAt: new Date().toISOString(),
        progress: `Ολοκληρώθηκε φάση «${phaseLabel}». Εκκίνηση επόμενης φάσης…`,
        error: null,
        workerPid: null,
      });
      if (!patched) {
        console.error(`[sync-worker] phase ${phase} done but job file changed (job=${jobId}).`);
        process.exitCode = 1;
      } else {
        console.log(`[sync-worker] phase ${phase} done job=${jobId} (${report.durationMs}ms) → next phase`);
      }
    }
  } catch (e) {
    const msg = e?.message || String(e);
    const patched = patchJobOnDisk(jobId, {
      status: 'failed',
      error: msg,
      finishedAt: new Date().toISOString(),
      progress: `Αποτυχία (${phaseLabel}): ${msg}`,
      workerPid: null,
    });
    if (!patched) {
      console.error(`[sync-worker] failed job=${jobId} but patch rejected`, e);
    } else {
      console.error(`[sync-worker] failed job=${jobId} phase=${phase}`, e);
    }
    process.exitCode = 1;
  } finally {
    if (strapi) {
      try {
        await strapi.destroy();
      } catch {
        // ignore
      }
    }
  }
}

function runSyncInProcess(strapi, jobRef, options, finish, onProgress) {
  const heartbeat = setInterval(() => {
    if (jobRef.status !== 'running') {
      clearInterval(heartbeat);
      return;
    }
    const ref = jobRef.lastProgressAt || jobRef.startedAt;
    if (ref && Date.now() - new Date(ref).getTime() > STALE_MS) {
      finish({
        status: 'failed',
        error:
          'Το sync κόλλησε χωρίς πρόοδο. Χρησιμοποίησε worker mode (default) ή μείωσε MORE_SHOWTIME_SYNC_CONCURRENCY.',
        finishedAt: new Date().toISOString(),
        progress: 'Κολλημένο',
      });
      clearInterval(heartbeat);
      strapi.log.error(`[more-showtime-sync] job ${jobRef.id} stale`);
    }
  }, HEARTBEAT_MS);

  (async () => {
    try {
      const report = await syncShowtimesFromMore(strapi, { ...options, onProgress });
      finish({
        status: 'completed',
        report,
        finishedAt: new Date().toISOString(),
        progress: report.message || 'Ολοκληρώθηκε',
        error: null,
      });
      strapi.log.info(`[more-showtime-sync] job ${jobRef.id} completed (${report.durationMs}ms)`);
    } catch (e) {
      const msg = e?.message || String(e);
      finish({
        status: 'failed',
        error: msg,
        finishedAt: new Date().toISOString(),
        progress: `Αποτυχία: ${msg}`,
      });
      strapi.log.error(`[more-showtime-sync] job ${jobRef.id} failed`, e);
    } finally {
      clearInterval(heartbeat);
    }
  })().catch((e) => {
    if (jobRef.status === 'running') {
      const msg = e?.message || String(e);
      finish({
        status: 'failed',
        error: msg,
        finishedAt: new Date().toISOString(),
        progress: `Αποτυχία: ${msg}`,
      });
    }
    clearInterval(heartbeat);
  });
}

/**
 * @returns {{ started: boolean, reason?: string, job: object | null }}
 */
function startMoreShowtimeSyncJob(strapi, options = {}) {
  if (activeJob?.status === 'running') {
    if (options.force === true || isJobStale(activeJob)) {
      resetStuckMoreShowtimeSyncJob(
        options.force === true ? 'Ακυρώθηκε χειροκίνητα — ξεκινά νέο sync.' : undefined,
      );
    } else {
      return { started: false, reason: 'already_running', job: publicJob(activeJob) };
    }
  }

  const diskRunning = loadPersistedJob();
  if (diskRunning?.status === 'running' && !options.force && !isJobStale(diskRunning)) {
    activeJob = diskRunning;
    return { started: false, reason: 'already_running', job: publicJob(diskRunning) };
  }

  // scope: 'cinema' | 'theater' | 'all'. Single-entity sync κλειδώνει το ανάλογο scope.
  let scope =
    options.scope === 'cinema' || options.scope === 'theater' ? options.scope : 'all';
  if (options.movieId != null) scope = 'cinema';
  if (options.theaterShowId != null) scope = 'theater';
  const phases = scope === 'all' ? ['cinema', 'theater'] : [scope];

  const id = `sync-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const scopeLabel =
    scope === 'cinema' ? 'σινεμά' : scope === 'theater' ? 'θέατρο' : 'σινεμά + θέατρο';
  activeJob = {
    id,
    status: 'running',
    startedAt,
    lastProgressAt: startedAt,
    progress: `Έναρξη συγχρονισμού (${scopeLabel})…`,
    report: null,
    error: null,
    scope,
    phases,
    phaseIndex: 0,
    phaseReports: {},
    workerOptions: {
      movieId: options.movieId,
      theaterShowId: options.theaterShowId,
    },
  };
  persistJob(activeJob);

  if (USE_WORKER) {
    setTimeout(() => {
      try {
        spawnSyncWorker(strapi, id);
        touchJobProgress(activeJob, 'Worker ξεκίνησε — συγχρονισμός More σε εξέλιξη…');
      } catch (e) {
        failJob(
          activeJob,
          e?.message || 'Αποτυχία εκκίνησης worker — έλεγξε logs data/more-showtime-sync-worker.log',
        );
        strapi.log.error('[more-showtime-sync] worker spawn failed', e);
      }
    }, START_DELAY_MS);
    return { started: true, job: publicJob(activeJob), mode: 'worker' };
  }

  const jobRef = activeJob;
  const onProgress = (msg) => {
    if (jobRef.status !== 'running' || !msg) return;
    touchJobProgress(jobRef, msg);
    if (typeof options.onProgress === 'function') options.onProgress(msg);
  };
  const finish = (patch) => {
    Object.assign(jobRef, patch);
    persistJob(jobRef);
  };

  setTimeout(() => {
    runSyncInProcess(strapi, jobRef, options, finish, onProgress);
  }, START_DELAY_MS);

  return { started: true, job: publicJob(activeJob), mode: 'in-process' };
}

module.exports = {
  getMoreShowtimeSyncJob,
  isMoreShowtimeSyncRunning,
  startMoreShowtimeSyncJob,
  resetStuckMoreShowtimeSyncJob,
  resumeOrphanedSyncWorker,
  runMoreShowtimeSyncWorker,
  failJobById,
};
