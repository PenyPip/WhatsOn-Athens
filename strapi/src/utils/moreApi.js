'use strict';

const { fetchMore } = require('./moreHttp');

const MORE_GETEVENTS = 'https://www.more.com/_api/playdetails/getevents';
const USER_AGENT = 'whatson-more-sync/1.0';
const FETCH_TIMEOUT_MS = 20_000;

async function parseMoreEventsJsonResponse(res, code) {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return [];
  let data;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    throw new Error(
      `More API JSON (${code}): ${e?.message || 'parse error'} · ${trimmed.slice(0, 120)}`,
    );
  }
  if (!Array.isArray(data)) throw new Error(`More API (${code}): αναμενόταν JSON array`);
  return data;
}

function moreEventsApiUrl(eventGroupCode) {
  const code = String(eventGroupCode || '').trim();
  return `${MORE_GETEVENTS}?eventGroupCode=${encodeURIComponent(code)}`;
}

async function fetchMoreEventsByGroupCode(eventGroupCode) {
  const code = String(eventGroupCode || '').trim();
  if (!code) return [];

  const url = moreEventsApiUrl(code);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetchMore(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`More API HTTP ${res.status} (${code})`);
    }
    return await parseMoreEventsJsonResponse(res, code);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchMoreEventsByGroupCode,
  moreEventsApiUrl,
};
