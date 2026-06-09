'use strict';

const { fetch: undiciFetch, ProxyAgent } = require('undici');

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
  const proxyUrl = resolveMoreProxyUrl();
  if (!proxyUrl) {
    cachedProxyUrl = null;
    cachedProxyAgent = null;
    return null;
  }
  if (cachedProxyAgent && cachedProxyUrl === proxyUrl) return cachedProxyAgent;
  cachedProxyUrl = proxyUrl;
  cachedProxyAgent = new ProxyAgent(proxyUrl);
  return cachedProxyAgent;
}

function isMoreProxyEnabled() {
  return Boolean(resolveMoreProxyUrl());
}

/** Για logs/admin — χωρίς credentials. */
function getMoreProxyStatus() {
  const raw = resolveMoreProxyUrl();
  if (!raw) return { enabled: false, host: null };
  try {
    const u = new URL(raw);
    return {
      enabled: true,
      host: u.hostname,
      port: u.port || (u.protocol === 'https:' ? '443' : '80'),
    };
  } catch {
    return { enabled: true, host: '(invalid MORE_HTTP_PROXY URL)' };
  }
}

/**
 * Fetch προς More — αν υπάρχει MORE_HTTP_PROXY, βγαίνει από IP του proxy.
 * @param {string} url
 * @param {RequestInit & { dispatcher?: unknown }} [options]
 */
async function fetchMore(url, options = {}) {
  const agent = getMoreProxyAgent();
  if (agent) {
    return undiciFetch(url, { ...options, dispatcher: agent });
  }
  return fetch(url, options);
}

module.exports = {
  fetchMore,
  isMoreProxyEnabled,
  getMoreProxyStatus,
};
