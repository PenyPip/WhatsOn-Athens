#!/usr/bin/env bash
# Σταματά το Strapi, τρέχει sync χωρίς διπλό instance (λύση για επαναλαμβανόμενα 502).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Σταμάτημα Strapi (admin/site down για λίγο)…"
docker compose stop strapi

echo "==> Offline sync (5–20 λεπτά)…"
docker compose run --rm --no-deps \
  -e MORE_SHOWTIME_SYNC_IN_PROCESS=true \
  -e NODE_OPTIONS="--max-old-space-size=1024 --expose-gc" \
  strapi node scripts/sync-offline.js

echo "==> Εκκίνηση Strapi…"
docker compose start strapi

echo "==> Έτοιμο."
