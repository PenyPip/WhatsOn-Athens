#!/bin/sh
set -e

# Stale chunks στο named volume → MODULE_NOT_FOUND (./611.js) / missing routes-manifest.
echo "[whatson] Fresh .next for dev..."
rm -rf /front/.next

exec npm run dev -- --hostname 0.0.0.0 -p 3000 --turbo
