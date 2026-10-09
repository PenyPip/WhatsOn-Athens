'use strict';

const { sendMail, mailEnabled } = require('./sendMail');

const ATHENS_TZ = 'Europe/Athens';
const ALERT_UID = 'api::movie-release-alert.movie-release-alert';

function siteBaseUrl() {
  const raw = process.env.PUBLIC_URL || process.env.URL || 'https://the37n.gr';
  return String(raw).replace(/\/+$/, '');
}

function todayAthensKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATHENS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

function showtimeIsUpcoming(row, now = new Date()) {
  if (!row?.datetime) return false;
  const start = new Date(row.datetime);
  if (Number.isNaN(start.getTime())) return false;
  if (row.schedule_kind === 'week_block' && row.week_end) {
    const end = new Date(`${String(row.week_end).trim()}T23:59:59`);
    return end.getTime() >= now.getTime();
  }
  return start.getTime() >= now.getTime();
}

function isUniqueError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return msg.includes('unique') || msg.includes('duplicate');
}

function escapeHtml(raw) {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMovieStartedEmail({ title, slug }) {
  const url = `${siteBaseUrl()}/movies/${encodeURIComponent(slug)}`;
  const subject = `Ξεκίνησαν οι προβολές — ${title}`;
  const text =
    `Γεια σου!\n\n` +
    `Η ταινία «${title}» που έχεις στα αγαπημένα ξεκίνησε να προβάλλεται.\n\n` +
    `Δες το πρόγραμμα: ${url}\n\n` +
    `— 37°N Athens\n` +
    `Αυτή η ενημέρωση στέλνεται μία φορά, όταν ξεκινούν οι προβολές.`;
  const html =
    `<p>Γεια σου!</p>` +
    `<p>Η ταινία <strong>${escapeHtml(title)}</strong> που έχεις στα αγαπημένα ξεκίνησε να προβάλλεται.</p>` +
    `<p><a href="${escapeHtml(url)}">Δες το πρόγραμμα στο 37°N</a></p>` +
    `<p style="color:#666;font-size:12px">Αυτή η ενημέρωση στέλνεται μία φορά, όταν ξεκινούν οι προβολές.</p>`;
  return { subject, text, html, url };
}

async function hasOtherUpcomingShowtime(strapi, movieId, showtimeId, now) {
  const rows = await strapi.entityService.findMany('api::showtime.showtime', {
    filters: {
      id: { $ne: showtimeId },
      movie: { id: movieId },
      $or: [
        { datetime: { $gte: now.toISOString() } },
        {
          schedule_kind: 'week_block',
          week_end: { $gte: todayAthensKey(now) },
        },
      ],
    },
    fields: ['id'],
    publicationState: 'preview',
    limit: 1,
  });
  return Array.isArray(rows) && rows.length > 0;
}

async function loadFavoriteRecipients(strapi, movieId) {
  let profiles = await strapi.entityService.findMany('api::user-profile.user-profile', {
    filters: { favorite_movies: { id: { $eq: movieId } } },
    populate: { user: { fields: ['id', 'email', 'blocked'] } },
    limit: 500,
  });
  if (!Array.isArray(profiles) || !profiles.length) {
    profiles = await strapi.db.query('api::user-profile.user-profile').findMany({
      where: { favorite_movies: { id: movieId } },
      populate: { user: true },
      limit: 500,
    });
  }
  const recipients = [];
  for (const profile of profiles || []) {
    const user = profile.user;
    const userId = user?.id ?? user;
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (!userId || user?.blocked || !email.includes('@')) continue;
    recipients.push({ userId: Number(userId), email });
  }
  return recipients;
}

async function deliverMovieScreeningAlert(strapi, claim) {
  const movieId = Number(claim?.movie_id);
  if (!Number.isFinite(movieId) || movieId <= 0) return { sent: 0 };

  const movie = await strapi.db.query('api::movie.movie').findOne({
    where: { id: movieId },
    select: ['id', 'title', 'slug'],
  });
  if (!movie?.slug || !movie?.title) {
    await strapi.entityService.update(ALERT_UID, claim.id, {
      data: { done: true, sent_count: 0 },
    });
    return { sent: 0, reason: 'movie_missing' };
  }

  const recipients = await loadFavoriteRecipients(strapi, movieId);
  const emailContent = buildMovieStartedEmail({ title: movie.title, slug: movie.slug });
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendMail({
        to: recipient.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
      if (result.skipped) {
        failed += 1;
        strapi.log.warn(
          `[movie-alert] skipped user=${recipient.userId}: ${result.reason}`,
        );
        continue;
      }
      sent += 1;
      strapi.log.info(
        `[movie-alert] sent user=${recipient.userId} to=${recipient.email} movie=${movieId} messageId=${result.messageId || '-'}`,
      );
    } catch (err) {
      failed += 1;
      strapi.log.warn(
        `[movie-alert] failed user=${recipient.userId} movie=${movieId}: ${err?.message || err}`,
      );
    }
  }

  if (failed > 0 && sent === 0) {
    return { sent: 0, failed, pending: true };
  }

  await strapi.entityService.update(ALERT_UID, claim.id, {
    data: { done: true, sent_count: sent },
  });
  return { sent, failed };
}

/**
 * Πρώτη μελλοντική προβολή της ταινίας: κράτα τη μία ειδοποίηση πριν δημιουργηθούν οι επόμενες.
 * Το mail φεύγει μετά, ώστε το sync να μη μένει στο SMTP.
 * Όσοι την προσθέσουν αφού έχουν ήδη προβολές δεν ειδοποιούνται.
 */
async function claimMovieScreeningAlert(strapi, showtimeId, { now = new Date() } = {}) {
  if (!mailEnabled()) return { claim: null, skipped: 'mail_disabled' };
  const sid = Number(showtimeId);
  if (!Number.isFinite(sid) || sid <= 0) return { claim: null, skipped: 'not_start' };

  const showtime = await strapi.entityService.findOne('api::showtime.showtime', sid, {
    fields: ['id', 'datetime', 'week_end', 'schedule_kind', 'import_source'],
    populate: { movie: { fields: ['id'] } },
  });
  if (!showtime || showtime.import_source === 'repeat_expand') {
    return { claim: null, skipped: 'not_start' };
  }
  if (!showtimeIsUpcoming(showtime, now)) return { claim: null, skipped: 'past' };

  const movieId = Number(showtime.movie?.id ?? showtime.movie);
  if (!Number.isFinite(movieId) || movieId <= 0) return { claim: null, skipped: 'no_movie' };

  const existing = await strapi.db.query(ALERT_UID).findOne({
    where: { movie_id: movieId },
    select: ['id', 'done', 'movie_id'],
  });
  if (existing) return { claim: null, skipped: 'already_notified' };

  if (await hasOtherUpcomingShowtime(strapi, movieId, sid, now)) {
    return { claim: null, skipped: 'already_screening' };
  }

  try {
    const claim = await strapi.entityService.create(ALERT_UID, {
      data: { movie_id: movieId, done: false, sent_count: 0 },
    });
    return { claim: { id: claim.id, movie_id: movieId }, skipped: null };
  } catch (err) {
    if (isUniqueError(err)) return { claim: null, skipped: 'already_notified' };
    throw err;
  }
}

async function beginMovieScreeningAlert(strapi, showtimeId, options) {
  const claimed = await claimMovieScreeningAlert(strapi, showtimeId, options);
  if (!claimed.claim) return { sent: 0, skipped: claimed.skipped };
  return deliverMovieScreeningAlert(strapi, claimed.claim);
}

let movieAlertFlush = null;

/** Ένα πέρασμα ανά «γύρο» εγγραφών, όχι cron. Στέλνει ό,τι μόλις κατοχυρώθηκε και ό,τι έμεινε απέτυτο. */
function enqueueMovieAlertFlush(strapi) {
  if (movieAlertFlush) return movieAlertFlush;
  movieAlertFlush = new Promise((resolve) => {
    setImmediate(() => {
      processPendingMovieScreeningAlerts(strapi)
        .catch((err) => {
          strapi.log.warn(`[movie-alert] flush: ${err?.message || err}`);
        })
        .finally(() => {
          movieAlertFlush = null;
          resolve();
        });
    });
  });
  return movieAlertFlush;
}

async function scheduleMovieScreeningAlert(strapi, showtimeId) {
  const claimed = await claimMovieScreeningAlert(strapi, showtimeId);
  if (mailEnabled()) enqueueMovieAlertFlush(strapi);
  return claimed;
}

async function processPendingMovieScreeningAlerts(strapi) {
  if (!mailEnabled()) return { sent: 0, skipped: 'mail_disabled' };
  const pending = await strapi.entityService.findMany(ALERT_UID, {
    filters: { done: { $ne: true } },
    fields: ['id', 'movie_id', 'done', 'sent_count'],
    limit: 50,
  });
  let sent = 0;
  for (const claim of Array.isArray(pending) ? pending : []) {
    const result = await deliverMovieScreeningAlert(strapi, claim);
    sent += result.sent || 0;
  }
  return { sent, pending: Array.isArray(pending) ? pending.length : 0 };
}

module.exports = {
  showtimeIsUpcoming,
  claimMovieScreeningAlert,
  beginMovieScreeningAlert,
  scheduleMovieScreeningAlert,
  processPendingMovieScreeningAlerts,
  buildMovieStartedEmail,
};
