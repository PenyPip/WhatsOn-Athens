#!/bin/sh
set -e

# Το .next είναι named volume — δεν διαγράφεται ο mount point (Resource busy), μόνο τα περιεχόμενα.
echo "[whatson] Clearing .next dev volume contents..."
if [ -d /front/.next ]; then
  find /front/.next -mindepth 1 -delete 2>/dev/null || true
fi

# Turbopack δεν γράφει .next/server/app-paths-manifest.json — requests (/admin proxy) πέφτουν με ENOENT.
echo "[whatson] Starting Next.js (webpack dev, όχι --turbo στο Docker)..."
echo "[whatson] Περίμενε «Ready» πριν ανοίξεις http://localhost:3000"

exec npm run dev:docker
