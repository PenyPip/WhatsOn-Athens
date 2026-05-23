#!/bin/sh
set -e

# Incomplete .next after build/interrupt causes missing routes-manifest.json
if [ -d /front/.next/server ] && [ ! -f /front/.next/routes-manifest.json ]; then
  echo "[whatson] Clearing broken .next (missing routes-manifest.json)..."
  rm -rf /front/.next
fi

exec npm run dev -- --hostname 0.0.0.0 -p 3000
