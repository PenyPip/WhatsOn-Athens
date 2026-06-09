#!/bin/sh
set -e
cd /cms

needs_ci=0
if [ ! -d node_modules/@swc/core-linux-arm64-gnu ] && [ ! -d node_modules/@swc/core-linux-x64-gnu ]; then
  needs_ci=1
fi
if [ -d node_modules/@swc/core-darwin-arm64 ] || [ -d node_modules/@swc/core-darwin-x64 ]; then
  needs_ci=1
fi
if [ -d node_modules/@swc/core-linux-arm64-musl ] || [ -d node_modules/@swc/core-linux-x64-musl ]; then
  needs_ci=1
fi

if [ "$needs_ci" -eq 1 ]; then
  echo "[strapi-dev] Εγκατάσταση dependencies για Linux (npm ci)…"
  rm -rf node_modules
  npm ci --no-audit --no-fund --include=optional
  sh scripts/install-swc-native.sh
else
  LOCK_STAMP="/cms/node_modules/.package-lock-hash"
  if command -v md5sum >/dev/null 2>&1; then
    CURRENT_LOCK=$(md5sum package-lock.json | awk '{print $1}')
  else
    CURRENT_LOCK=$(md5 -q package-lock.json)
  fi
  if [ ! -f "$LOCK_STAMP" ] || [ "$(cat "$LOCK_STAMP" 2>/dev/null)" != "$CURRENT_LOCK" ]; then
    echo "[strapi-dev] Ενημέρωση dependencies (package-lock άλλαξε)…"
    npm ci --no-audit --no-fund --include=optional
    sh scripts/install-swc-native.sh
    echo "$CURRENT_LOCK" > "$LOCK_STAMP"
  fi
fi

exec "$@"
