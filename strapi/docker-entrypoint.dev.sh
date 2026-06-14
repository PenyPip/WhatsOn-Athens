#!/bin/sh
set -e
cd /cms

LOCK_STAMP="/cms/node_modules/.package-lock-hash"

lock_hash() {
  if command -v md5sum >/dev/null 2>&1; then
    md5sum package-lock.json | awk '{print $1}'
  else
    md5 -q package-lock.json
  fi
}

node_modules_ready() {
  [ -f node_modules/@strapi/admin/package.json ] \
    && [ -f node_modules/@strapi/strapi/package.json ] \
    && [ -d node_modules/@swc/core-linux-arm64-gnu ] || [ -d node_modules/@swc/core-linux-x64-gnu ]
}

needs_platform_reinstall() {
  if [ -d node_modules/@swc/core-darwin-arm64 ] || [ -d node_modules/@swc/core-darwin-x64 ]; then
    return 0
  fi
  if [ -d node_modules/@swc/core-linux-arm64-musl ] || [ -d node_modules/@swc/core-linux-x64-musl ]; then
    return 0
  fi
  if ! node_modules_ready; then
    return 0
  fi
  return 1
}

seed_from_image() {
  if [ ! -d /opt/strapi-node_modules/@strapi/admin ]; then
    return 1
  fi
  echo "[strapi-dev] Αντιγραφή node_modules από image…"
  rm -rf node_modules
  mkdir -p node_modules
  cp -a /opt/strapi-node_modules/. node_modules/
  sh scripts/install-swc-native.sh
  lock_hash > "$LOCK_STAMP"
  return 0
}

run_npm_ci() {
  echo "[strapi-dev] npm ci (Linux dependencies)…"
  rm -rf node_modules
  npm ci --no-audit --no-fund --include=optional
  sh scripts/install-swc-native.sh
  lock_hash > "$LOCK_STAMP"
}

install_node_modules() {
  if seed_from_image; then
    return 0
  fi
  run_npm_ci || {
    echo "[strapi-dev] npm ci απέτυχε — καθαρισμός volume και 2η προσπάθεια…"
    rm -rf node_modules
    run_npm_ci
  }
}

if needs_platform_reinstall; then
  install_node_modules
else
  CURRENT_LOCK=$(lock_hash)
  if [ ! -f "$LOCK_STAMP" ] || [ "$(cat "$LOCK_STAMP" 2>/dev/null)" != "$CURRENT_LOCK" ]; then
    echo "[strapi-dev] package-lock άλλαξε — ενημέρωση dependencies…"
    run_npm_ci || {
      echo "[strapi-dev] npm ci απέτυχε — καθαρισμός volume και 2η προσπάθεια…"
      rm -rf node_modules
      run_npm_ci
    }
  fi
fi

exec "$@"
