#!/usr/bin/env bash
# Άδειασμα nginx proxy_cache για /api/* (μετά από bulk ενημέρωση προγράμματος).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if docker compose ps nginx --status running >/dev/null 2>&1; then
  docker compose exec nginx sh -c 'rm -rf /var/cache/nginx/api/* 2>/dev/null; mkdir -p /var/cache/nginx/api; echo "nginx API cache purged"'
else
  echo "nginx container not running — skip purge" >&2
  exit 1
fi
