#!/usr/bin/env bash
set -euo pipefail

# Static export («prod» SPA) στο :8080 με proxy /api → Strapi στο host:1337
# Προαπαιτείται: Strapi ανοιχτό (π.χ. docker compose -f ../docker-compose.dev.yml up strapi mysql)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-8080}"

npm run build

echo ""
echo "Άνοιξε http://localhost:${PORT}  ·  Strapi → http://localhost:1337"
echo ""

docker run --rm \
  --name whatson-export-prod-test \
  -p "${PORT}:80" \
  --add-host=host.docker.internal:host-gateway \
  -v "$ROOT/out:/usr/share/nginx/html:ro" \
  -v "$ROOT/nginx-local-prod-proxy.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine
