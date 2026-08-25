'use strict';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function yieldEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function maybeGc() {
  if (typeof global.gc === 'function') global.gc();
}

module.exports = { sleep, yieldEventLoop, maybeGc };
