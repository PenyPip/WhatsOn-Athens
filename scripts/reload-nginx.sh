#!/usr/bin/env sh
# Εφαρμογή αλλαγών nginx.conf (volume mount — δεν χρειάζεται rebuild image).
set -eu
cd "$(dirname "$0")/.."

if ! docker compose ps nginx --status running >/dev/null 2>&1; then
  echo "nginx container not running" >&2
  exit 1
fi

docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
echo "nginx reloaded"
