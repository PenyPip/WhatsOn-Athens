'use strict';

const { fetchMoreEventsByGroupCode } = require('../moreApi');
const { sleep, yieldEventLoop } = require('./runtime');

const EVENTS_CACHE_MAX = Number(process.env.MORE_SHOWTIME_SYNC_EVENTS_CACHE_MAX || 512);

function createEventsCache(fetchDelayMs, fetchProgress) {
  /** Map insertion order = LRU order (oldest first). */
  const cache = new Map();
  const fetchProgressFn = typeof fetchProgress === 'function' ? fetchProgress : null;

  function touch(key) {
    if (!cache.has(key)) return;
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
  }

  function trimCache() {
    while (cache.size > EVENTS_CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  async function fetchAndStore(key, { skipTrim = false } = {}) {
    let events = [];
    try {
      events = await fetchMoreEventsByGroupCode(key);
    } catch (e) {
      const msg = e?.message || String(e);
      console.warn(`[more-showtime-sync] getevents failed (${key}): ${msg}`);
      events = [];
    }
    if (cache.has(key)) cache.delete(key);
    cache.set(key, events);
    if (!skipTrim) trimCache();
    return events;
  }

  return {
    size() {
      return cache.size;
    },
    has(code) {
      const key = String(code || '').trim();
      return Boolean(key && cache.has(key));
    },
    /** Μόνο cache — χωρίς More API (για enrich labels κ.λπ.). */
    peek(code) {
      const key = String(code || '').trim();
      if (!key || !cache.has(key)) return null;
      touch(key);
      return cache.get(key);
    },
    clear() {
      cache.clear();
    },
    async get(code) {
      const key = String(code || '').trim();
      if (!key) return [];
      if (cache.has(key)) {
        touch(key);
        return cache.get(key);
      }
      if (fetchProgressFn) fetchProgressFn(key);
      const events = await fetchAndStore(key);
      if (fetchDelayMs > 0) await sleep(fetchDelayMs);
      if (cache.size % 8 === 0) await yieldEventLoop();
      return events;
    },
    /** Παράλληλο prefetch μοναδικών κωδικών — πολύ πιο γρήγορο από σειριακό sync. */
    async prefetchAll(codes, options = {}) {
      const concurrency = Number(
        options.concurrency ?? process.env.MORE_SHOWTIME_SYNC_CONCURRENCY ?? 4,
      );
      const delayMs = Number(options.delayMs ?? fetchDelayMs);
      const unique = [
        ...new Set((codes || []).map((c) => String(c || '').trim()).filter(Boolean)),
      ];
      if (!unique.length) return { total: 0, fetched: 0 };

      let cursor = 0;
      let fetched = 0;

      let lastProgressAt = 0;
      async function worker() {
        while (cursor < unique.length) {
          const idx = cursor;
          cursor += 1;
          const key = unique[idx];
          if (!key || cache.has(key)) {
            if (key && cache.has(key)) touch(key);
            continue;
          }
          await fetchAndStore(key, { skipTrim: true });
          fetched += 1;
          if (typeof options.onProgress === 'function' && fetched - lastProgressAt >= 8) {
            lastProgressAt = fetched;
            options.onProgress(`More API: ${fetched}/${unique.length} κωδικοί…`);
          }
          if (delayMs > 0) await sleep(delayMs);
          if (fetched % 12 === 0) await yieldEventLoop();
        }
      }

      const workers = Math.min(Math.max(1, concurrency), unique.length);
      await Promise.all(Array.from({ length: workers }, () => worker()));
      trimCache();
      return { total: unique.length, fetched };
    },
  };
}


module.exports = { createEventsCache, EVENTS_CACHE_MAX };
