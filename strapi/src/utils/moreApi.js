'use strict';

const MORE_GETEVENTS = 'https://www.more.com/_api/playdetails/getevents';
const USER_AGENT = 'whatson-more-sync/1.0';
const FETCH_TIMEOUT_MS = 20_000;

async function fetchMoreEventsByGroupCode(eventGroupCode) {
  const code = String(eventGroupCode || '').trim();
  if (!code) return [];

  const url = `${MORE_GETEVENTS}?eventGroupCode=${encodeURIComponent(code)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`More API HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('More API: αναμενόταν JSON array');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchMoreEventsByGroupCode,
};
