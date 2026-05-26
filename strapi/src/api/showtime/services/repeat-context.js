'use strict';

/** Βάθος nested create από expandRepeatShowtimes — τα child lifecycle μένουν no-op. */
let repeatChildDepth = 0;

function isRepeatChildCreate() {
  return repeatChildDepth > 0;
}

async function runAsRepeatChild(fn) {
  repeatChildDepth += 1;
  try {
    return await fn();
  } finally {
    repeatChildDepth -= 1;
  }
}

module.exports = {
  isRepeatChildCreate,
  runAsRepeatChild,
};
