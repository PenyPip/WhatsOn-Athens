'use strict';

const { sendMail, mailEnabled } = require('./sendMail');

const ATHENS_TZ = 'Europe/Athens';
const LOOKBACK_MS = 25 * 60 * 1000;
const NEW_PERFORMANCE_DAYS = 7;

function siteBaseUrl() {
  const raw = process.env.PUBLIC_URL || process.env.URL || 'https://the37n.gr';
  return String(raw).replace(/\/+$/, '');
}

function formatAthensDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('el-GR', {
    timeZone: ATHENS_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatAthensDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('el-GR', {
    timeZone: ATHENS_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function performanceIsUpcoming(perf, now = new Date()) {
  if (!perf?.datetime) return false;
  const start = new Date(perf.datetime);
  if (Number.isNaN(start.getTime())) return false;
  if (perf.schedule_kind === 'week_block' && perf.week_end) {
    const end = new Date(`${String(perf.week_end).trim()}T23:59:59`);
    return end.getTime() >= now.getTime();
  }
  return start.getTime() >= now.getTime();
}

function formatPerformanceLine(perf) {
  const venueName = perf.venue?.name?.trim() || 'Χώρος';
  if (perf.schedule_kind === 'week_block') {
    const from = formatAthensDate(perf.datetime);
    const to = perf.week_end ? formatAthensDate(perf.week_end) : '';
    return to && to !== from ? `${from} – ${to} · ${venueName}` : `${from} · ${venueName}`;
  }
  return `${formatAthensDateTime(perf.datetime)} · ${venueName}`;
}

async function findSubscription(strapi, userId, theaterShowId) {
  return strapi.db.query('api::theater-show-subscription.theater-show-subscription').findOne({
    where: {
      user: userId,
      theater_show: theaterShowId,
    },
  });
}

async function ensureSubscription(strapi, userId, theaterShowId, source = 'seen') {
  const uid = Number(userId);
  const sid = Number(theaterShowId);
  if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(sid) || sid <= 0) return null;

  const existing = await findSubscription(strapi, uid, sid);
  if (existing) {
    const data = { active: true };
    if (!existing.active || source === 'follow') {
      data.source = source;
    }
    if (!existing.active || data.source) {
      await strapi.entityService.update('api::theater-show-subscription.theater-show-subscription', existing.id, {
        data,
      });
    }
    return existing.id;
  }

  const created = await strapi.entityService.create('api::theater-show-subscription.theater-show-subscription', {
    data: {
      user: uid,
      theater_show: sid,
      active: true,
      source,
    },
  });
  return created.id;
}

async function deactivateSubscription(strapi, userId, theaterShowId) {
  const existing = await findSubscription(strapi, userId, theaterShowId);
  if (!existing || !existing.active) return;
  await strapi.entityService.update('api::theater-show-subscription.theater-show-subscription', existing.id, {
    data: { active: false },
  });
}

async function wasAlertSent(strapi, userId, performanceId) {
  const row = await strapi.db.query('api::theater-alert-sent.theater-alert-sent').findOne({
    where: {
      user: userId,
      theater_performance: performanceId,
    },
    select: ['id'],
  });
  return Boolean(row);
}

async function markAlertSent(strapi, userId, performanceIds) {
  for (const performanceId of performanceIds) {
    const already = await wasAlertSent(strapi, userId, performanceId);
    if (already) continue;
    await strapi.entityService.create('api::theater-alert-sent.theater-alert-sent', {
      data: {
        user: userId,
        theater_performance: performanceId,
      },
    });
  }
}

async function loadUserEmail(strapi, userId) {
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['id', 'email', 'username', 'blocked'],
  });
  if (!user || user.blocked) return null;
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (!email || !email.includes('@')) return null;
  return { id: user.id, email, username: user.username || email };
}

function buildEmail({ showTitle, showSlug, lines }) {
  const url = `${siteBaseUrl()}/theater/${encodeURIComponent(showSlug)}#theater-performances`;
  const subject = `Νέες ημερομηνίες — ${showTitle}`;
  const listText = lines.map((l) => `• ${l}`).join('\n');
  const text =
    `Γεια σου!\n\n` +
    `Προστέθηκαν νέες ημερομηνίες για την παράσταση «${showTitle}»:\n\n` +
    `${listText}\n\n` +
    `Δες το πρόγραμμα: ${url}\n\n` +
    `— 37°N Athens\n` +
    `Για να σταματήσεις τα email, αφαίρεσε την παράσταση από τα αγαπημένα σου στο the37n.gr.`;

  const listHtml = lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const html =
    `<p>Γεια σου!</p>` +
    `<p>Προστέθηκαν νέες ημερομηνίες για την παράσταση <strong>${escapeHtml(showTitle)}</strong>:</p>` +
    `<ul>${listHtml}</ul>` +
    `<p><a href="${escapeHtml(url)}">Δες το πρόγραμμα στο 37°N</a></p>` +
    `<p style="color:#666;font-size:12px">Για να σταματήσεις τα email, αφαίρεσε την παράσταση από τα αγαπημένα σου στο the37n.gr.</p>`;

  return { subject, text, html, url };
}

function escapeHtml(raw) {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function upcomingPerformanceFilters(now = new Date()) {
  const todayKey = todayAthensKey(now);
  return {
    $or: [
      { datetime: { $gte: now.toISOString() } },
      {
        schedule_kind: 'week_block',
        week_end: { $gte: todayKey },
      },
    ],
  };
}

function mapPosterUrl(row) {
  const poster = row?.poster;
  if (typeof poster === 'object' && poster?.url) return poster.url;
  if (typeof poster === 'object' && poster?.formats?.thumbnail?.url) return poster.formats.thumbnail.url;
  return null;
}

function isNewPerformanceForNotification(perf, now = new Date()) {
  if (perf?.import_source === 'repeat_expand') return false;
  if (!performanceIsUpcoming(perf, now)) return false;
  const raw = perf?.createdAt;
  if (!raw || typeof raw !== 'string') return false;
  const created = new Date(raw).getTime();
  if (!Number.isFinite(created)) return false;
  const ageMs = now.getTime() - created;
  return ageMs >= 0 && ageMs <= NEW_PERFORMANCE_DAYS * 24 * 60 * 60 * 1000;
}

function theaterVenueProgramPath(slug) {
  const s = String(slug || '').trim();
  return s ? `/theater/venue/${encodeURIComponent(s)}` : '/theater';
}

/** Ειδοποιήσεις προφίλ: αγαπημένα θέατρα-χώροι + παρακολούθηση παραστάσεων (κριτική / «Το είδα»). */
async function getProfileNotifications(strapi, userId, { now = new Date() } = {}) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    return { favoriteTheaterVenues: [], theaterShowUpdates: [], subscriptions: [] };
  }

  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: uid },
    populate: {
      favorite_venues: { fields: ['id', 'slug', 'name', 'type'] },
    },
  });

  const subscriptions = await strapi.db.query('api::theater-show-subscription.theater-show-subscription').findMany({
    where: { user: uid, active: true, source: 'follow' },
    populate: {
      theater_show: {
        fields: ['id', 'slug', 'title'],
        populate: { poster: { fields: ['url', 'formats'] } },
      },
    },
  });

  const performances = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
    filters: upcomingPerformanceFilters(now),
    fields: ['datetime', 'week_end', 'schedule_kind', 'createdAt', 'import_source'],
    populate: {
      theater_show: { fields: ['id'] },
      venue: { fields: ['id', 'slug', 'name', 'type'] },
    },
    sort: { datetime: 'asc' },
    limit: 3000,
  });

  const perfList = Array.isArray(performances) ? performances : [];

  const favoriteTheaterVenues = [];
  const theaterFavs = (profile?.favorite_venues || []).filter(
    (v) => String(v.type || '').trim().toLowerCase() === 'theater',
  );
  if (theaterFavs.length) {
    const favById = new Map(theaterFavs.map((v) => [Number(v.id), v]));
    const counts = new Map();
    const latest = new Map();

    for (const p of perfList) {
      if (!isNewPerformanceForNotification(p, now)) continue;
      const venueId = p.venue?.id != null ? Number(p.venue.id) : NaN;
      if (!Number.isFinite(venueId) || !favById.has(venueId)) continue;
      if (String(p.venue?.type || '').trim().toLowerCase() === 'cinema') continue;
      counts.set(venueId, (counts.get(venueId) || 0) + 1);
      const createdMs = Date.parse(p.createdAt);
      if (Number.isFinite(createdMs)) {
        const prev = latest.get(venueId) || 0;
        if (createdMs > prev) latest.set(venueId, createdMs);
      }
    }

    for (const [venueId, newCount] of counts) {
      const fav = favById.get(venueId);
      const slug = fav?.slug?.trim();
      if (!fav || !slug || newCount < 1) continue;
      favoriteTheaterVenues.push({
        venueId,
        venueName: fav.name,
        venueSlug: slug,
        href: theaterVenueProgramPath(slug),
        newCount,
        latestAt: new Date(latest.get(venueId) || now.getTime()).toISOString(),
      });
    }
    favoriteTheaterVenues.sort((a, b) => a.venueName.localeCompare(b.venueName, 'el'));
  }

  const subscribedShowIds = new Set();
  const subscriptionMeta = new Map();
  for (const sub of subscriptions || []) {
    const show = sub.theater_show;
    const showId = show?.id != null ? Number(show.id) : NaN;
    if (!Number.isFinite(showId)) continue;
    subscribedShowIds.add(showId);
    const slug = show?.slug?.trim();
    subscriptionMeta.set(showId, {
      showId,
      showTitle: show?.title || 'Παράσταση',
      showSlug: slug || '',
      posterUrl: mapPosterUrl(show),
      href: slug ? `/theater/${encodeURIComponent(slug)}#theater-performances` : '/theater',
      source: sub.source === 'review' ? 'review' : sub.source === 'follow' ? 'follow' : 'seen',
    });
  }

  const perfsByShow = new Map();
  for (const p of perfList) {
    const showId = p.theater_show?.id != null ? Number(p.theater_show.id) : NaN;
    if (!Number.isFinite(showId) || !subscribedShowIds.has(showId)) continue;
    if (!isNewPerformanceForNotification(p, now)) continue;
    if (!perfsByShow.has(showId)) perfsByShow.set(showId, []);
    perfsByShow.get(showId).push(p);
  }

  const theaterShowUpdates = [];
  for (const [showId, perfs] of perfsByShow) {
    const meta = subscriptionMeta.get(showId);
    if (!meta?.showSlug) continue;
    const lines = perfs.map(formatPerformanceLine);
    let latestMs = 0;
    for (const p of perfs) {
      const t = Date.parse(p.createdAt);
      if (Number.isFinite(t) && t > latestMs) latestMs = t;
    }
    theaterShowUpdates.push({
      ...meta,
      newCount: perfs.length,
      latestAt: new Date(latestMs || now.getTime()).toISOString(),
      performances: lines.slice(0, 5),
    });
  }
  theaterShowUpdates.sort((a, b) => a.showTitle.localeCompare(b.showTitle, 'el'));

  const updatedShowIds = new Set(theaterShowUpdates.map((u) => u.showId));
  const subscriptionsList = [...subscriptionMeta.values()]
    .filter((s) => !updatedShowIds.has(s.showId))
    .sort((a, b) => a.showTitle.localeCompare(b.showTitle, 'el'));

  return {
    favoriteTheaterVenues,
    theaterShowUpdates,
    subscriptions: subscriptionsList,
  };
}

async function notifySubscribersForShow(strapi, theaterShowId, performanceIds, { now = new Date() } = {}) {
  if (!mailEnabled()) return { sent: 0, skipped: 'mail_disabled' };
  const sid = Number(theaterShowId);
  const perfIds = [...new Set(performanceIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!Number.isFinite(sid) || sid <= 0 || !perfIds.length) return { sent: 0 };

  const show = await strapi.db.query('api::theater-show.theater-show').findOne({
    where: { id: sid },
    select: ['id', 'slug', 'title'],
  });
  if (!show?.slug) return { sent: 0 };

  const performances = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
    filters: { id: { $in: perfIds }, theater_show: sid },
    populate: { venue: { fields: ['name', 'slug'] } },
    sort: { datetime: 'asc' },
    limit: 20,
  });

  const upcoming = (performances || []).filter((p) => performanceIsUpcoming(p, now));
  if (!upcoming.length) return { sent: 0 };

  const subscriptions = await strapi.db.query('api::theater-show-subscription.theater-show-subscription').findMany({
    where: { theater_show: sid, active: true, source: 'follow' },
    select: ['id', 'user'],
  });
  if (!subscriptions.length) return { sent: 0 };

  const lines = upcoming.map(formatPerformanceLine);
  const emailContent = buildEmail({
    showTitle: show.title || 'Παράσταση',
    showSlug: show.slug,
    lines,
  });

  let sent = 0;
  for (const sub of subscriptions) {
    const userId = sub.user?.id ?? sub.user;
    if (!userId) continue;

    const pending = [];
    for (const perf of upcoming) {
      const already = await wasAlertSent(strapi, userId, perf.id);
      if (!already) pending.push(perf.id);
    }
    if (!pending.length) continue;

    const recipient = await loadUserEmail(strapi, userId);
    if (!recipient) continue;

    try {
      await sendMail({
        to: recipient.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
      await markAlertSent(strapi, userId, pending);
      await strapi.entityService.update('api::theater-show-subscription.theater-show-subscription', sub.id, {
        data: { last_emailed_at: now.toISOString() },
      });
      sent += 1;
    } catch (err) {
      strapi.log.warn(
        `[theater-alert] email failed user=${userId} show=${sid}: ${err?.message || err}`,
      );
    }
  }

  return { sent, performances: upcoming.length, subscribers: subscriptions.length };
}

async function processRecentTheaterPerformances(strapi, { sinceMs = LOOKBACK_MS, now = new Date() } = {}) {
  const since = new Date(now.getTime() - sinceMs);
  const rows = await strapi.entityService.findMany('api::theater-performance.theater-performance', {
    filters: {
      createdAt: { $gte: since.toISOString() },
    },
    fields: ['id'],
    populate: { theater_show: { fields: ['id'] } },
    limit: 500,
  });

  const byShow = new Map();
  for (const row of rows || []) {
    const showId = row.theater_show?.id ?? row.theater_show;
    if (!showId) continue;
    if (!byShow.has(showId)) byShow.set(showId, []);
    byShow.get(showId).push(row.id);
  }

  let totalSent = 0;
  for (const [showId, perfIds] of byShow) {
    const result = await notifySubscribersForShow(strapi, showId, perfIds, { now });
    totalSent += result.sent || 0;
  }
  return { shows: byShow.size, emailsSent: totalSent };
}

function deferNotifyPerformance(strapi, performanceId) {
  setImmediate(() => {
    (async () => {
      const perf = await strapi.entityService.findOne('api::theater-performance.theater-performance', performanceId, {
        fields: ['id'],
        populate: { theater_show: { fields: ['id'] } },
      });
      const showId = perf?.theater_show?.id ?? perf?.theater_show;
      if (!showId) return;
      await notifySubscribersForShow(strapi, showId, [performanceId]);
    })().catch((err) => {
      strapi.log.warn(`[theater-alert] deferred notify id=${performanceId}:`, err?.message || err);
    });
  });
}

module.exports = {
  ensureSubscription,
  deactivateSubscription,
  findSubscription,
  notifySubscribersForShow,
  processRecentTheaterPerformances,
  deferNotifyPerformance,
  getProfileNotifications,
  mailEnabled,
};
