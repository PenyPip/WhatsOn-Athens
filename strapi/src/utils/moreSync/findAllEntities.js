'use strict';

const { yieldEventLoop } = require('./runtime');

async function findAllEntities(strapi, uid, options = {}) {
  const pageSize = Math.min(Math.max(1, options.pageSize ?? 100), 250);
  const maxRecords = options.maxRecords ?? 10_000;
  const maxPages = options.maxPages ?? Math.ceil(maxRecords / pageSize) + 1;
  const onPageProgress = options.onPageProgress;
  const progressLabel = options.progressLabel;
  const base = { ...options };
  delete base.pageSize;
  delete base.maxRecords;
  delete base.maxPages;
  delete base.onPageProgress;
  delete base.progressLabel;

  let totalExpected = null;
  try {
    totalExpected = await strapi.entityService.count(uid, { filters: base.filters });
  } catch {
    // count optional
  }

  const seenIds = new Set();
  const all = [];
  let start = 0;

  const queryBase =
    base.sort != null ? base : { ...base, sort: { id: 'asc' } };

  for (let pageNum = 0; pageNum < maxPages; pageNum += 1) {
    const rows = await strapi.entityService.findMany(uid, {
      ...queryBase,
      pagination: { start, limit: pageSize },
    });
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) break;

    let addedThisPage = 0;
    for (const row of list) {
      const id = row?.id;
      if (id != null) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      all.push(row);
      addedThisPage += 1;
    }

    if (typeof onPageProgress === 'function') {
      const label = progressLabel || uid;
      const totalHint =
        totalExpected != null ? ` / ~${totalExpected}` : '';
      onPageProgress(`${label}: ${all.length}${totalHint} (offset ${start})…`);
    }

    if (all.length >= maxRecords) {
      throw new Error(
        `[more-showtime-sync] Υπερβολικά αποτελέσματα (${all.length}+) για ${uid} — πιθανό bug pagination. Σταμάτησε στο offset ${start}.`,
      );
    }

    // Κενή σελίδα ή μόνο duplicates ή τελευταία σελίδα
    if (addedThisPage === 0 || list.length < pageSize) break;
    if (totalExpected != null && all.length >= totalExpected) break;

    start += pageSize;
    if (pageNum % 3 === 2) await yieldEventLoop();
  }

  return all;
}


module.exports = { findAllEntities };
