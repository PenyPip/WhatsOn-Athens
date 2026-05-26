#!/bin/sh
set -e

# Incomplete ή production .next στο mount σπάει dev (ENOENT layout.js / RSC manifest).
should_clear_next() {
  [ ! -d /front/.next ] && return 1

  if [ -d /front/.next/server ] && [ ! -f /front/.next/routes-manifest.json ]; then
    return 0
  fi

  if [ -f /front/.next/export-marker.json ] || [ -f /front/.next/export-detail.json ]; then
    return 0
  fi

  if [ -f /front/.next/BUILD_ID ] && [ ! -f /front/.next/static/chunks/app/layout.js ]; then
    return 0
  fi

  return 1
}

if should_clear_next; then
  echo "[whatson] Clearing incompatible .next before dev..."
  rm -rf /front/.next
fi

exec npm run dev -- --hostname 0.0.0.0 -p 3000
