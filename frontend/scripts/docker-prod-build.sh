#!/bin/sh
set -eu

echo "[docker-build] node $(node -v)"
if [ -r /proc/meminfo ]; then
  awk '/MemTotal|MemAvailable/ {print "[docker-build]", $0}' /proc/meminfo
fi
echo "[docker-build] NODE_OPTIONS=${NODE_OPTIONS:-}"
echo "[docker-build] SITEMAP_STRAPI_URL=${SITEMAP_STRAPI_URL:-unset} strict=${SITEMAP_STRICT_MODE:-0}"

if ! npm run build; then
  code=$?
  echo "[docker-build] ΑΠΟΤΥΧΙΑ (exit ${code}). Συχνές αιτίες:" >&2
  echo "  - OOM: μείωσε NODE_HEAP_MB (π.χ. 2048) ή πρόσθεσε swap στο VPS" >&2
  echo "  - Strapi: ./scripts/deploy-production.sh πριν το frontend build" >&2
  echo "  - sitemap strict: SITEMAP_STRICT_MODE=0 για parallel compose build" >&2
  exit "${code}"
fi

if [ ! -d out ] || [ ! -f out/index.html ]; then
  echo "[docker-build] ΑΠΟΤΥΧΙΑ: λείπει ο φάκελος out/ (static export). Έλεγξε NODE_ENV=production και logs του next build." >&2
  exit 1
fi

echo "[docker-build] OK — $(find out -name '*.html' | wc -l | tr -d ' ') HTML files στο out/"
