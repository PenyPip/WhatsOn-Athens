'use strict';

let undiciFetch = null;
let ProxyAgentClass = null;

try {
  // Στο Docker (node:18-slim) το built-in fetch δεν εκθέτει require('undici') — χρειάζεται dependency.
  const undici = require('undici');
  undiciFetch = undici.fetch;
  ProxyAgentClass = undici.ProxyAgent;
} catch {
  /* proxy μέσω undici μόνο αν είναι εγκατεστημένο */
}

/**
 * Proxy μόνο για outbound κλήσεις στο more.com (όχι γενικό HTTPS_PROXY του server).
 * Παραδείγματα:
 *   MORE_HTTP_PROXY=http://user:pass@proxy.example.com:8080
 *   MORE_HTTP_PROXY=http://127.0.0.1:8888  (VPN/tunnel τοπικά)
 */
function resolveMoreProxyUrl() {
  return String(
    process.env.MORE_HTTP_PROXY ||
      process.env.MORE_HTTPS_PROXY ||
      '',
  ).trim();
}

let cachedProxyUrl = null;
let cachedProxyAgent = null;

function getMoreProxyAgent() {
  if (!ProxyAgentClass) return null;
  const proxyUrl = resolveMoreProxyUrl();
  if (!proxyUrl) {
    cachedProxyUrl = null;
    cachedProxyAgent = null;
    return null;
  }
  if (cachedProxyAgent && cachedProxyUrl === proxyUrl) return cachedProxyAgent;
  cachedProxyUrl = proxyUrl;
  cachedProxyAgent = new ProxyAgentClass(proxyUrl);
  return cachedProxyAgent;
}

function isMoreProxyEnabled() {
  return Boolean(resolveMoreProxyUrl()) && Boolean(ProxyAgentClass);
}

/** Για logs/admin — χωρίς credentials. */
function getMoreProxyStatus() {
  const raw = resolveMoreProxyUrl();
  if (!raw) return { enabled: false, host: null, undici: Boolean(ProxyAgentClass) };
  try {
    const u = new URL(raw);
    return {
      enabled: isMoreProxyEnabled(),
      host: u.hostname,
      port: u.port || (u.protocol === 'https:' ? '443' : '80'),
      undici: Boolean(ProxyAgentClass),
      note: ProxyAgentClass ? null : 'undici λείπει — proxy απενεργοποιημένο',
    };
  } catch {
    return { enabled: false, host: '(invalid MORE_HTTP_PROXY URL)', undici: Boolean(ProxyAgentClass) };
  }
}

/**
 * Fetch προς More — αν υπάρχει MORE_HTTP_PROXY + undici, βγαίνει από IP του proxy.
 * @param {string} url
 * @param {RequestInit & { dispatcher?: unknown }} [options]
 */
async function fetchMore(url, options = {}) {
  const agent = getMoreProxyAgent();
  if (agent && undiciFetch) {
    return undiciFetch(url, { ...options, dispatcher: agent });
  }
  return fetch(url, options);
}

/**
 * Ανθρώπινο μήνυμα για timeout/δίκτυο προς More (AbortError → «operation was aborted»).
 * @param {unknown} err
 * @param {{ url?: string, timeoutMs?: number, label?: string }} [ctx]
 */
function formatMoreNetworkError(err, ctx = {}) {
  const url = ctx.url ? String(ctx.url) : '';
  const timeoutMs = Number(ctx.timeoutMs) || 0;
  const label = ctx.label || 'More';
  const name = String(err?.name || '');
  const msg = String(err?.message || err || '');
  const timeoutSec = timeoutMs > 0 ? Math.round(timeoutMs / 1000) : null;

  if (name === 'AbortError' || /aborted/i.test(msg)) {
    const hint = timeoutSec
      ? `Timeout ${timeoutSec}s`
      : 'Timeout σύνδεσης';
    const proxyHint = resolveMoreProxyUrl()
      ? ''
      : ' · δοκίμασε MORE_HTTP_PROXY αν το more.com μπλοκάρει το server IP';
    return new Error(
      `${hint} — ${label}${url ? ` (${url})` : ''}${proxyHint}`,
    );
  }

  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|fetch failed|socket hang up/i.test(msg)) {
    return new Error(`Αδυναμία σύνδεσης με ${label}: ${msg}${url ? ` · ${url}` : ''}`);
  }

  return err instanceof Error ? err : new Error(msg || `Σφάλμα ${label}`);
}

module.exports = {
  fetchMore,
  isMoreProxyEnabled,
  getMoreProxyStatus,
  formatMoreNetworkError,
};
