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
fi

exec "$@"
