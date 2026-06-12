#!/usr/bin/env bash
# Production deploy: Strapi πρώτα (για sitemap/static paths), μετά frontend build, μετά όλο το stack.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/4 MySQL + Strapi"
docker compose up -d mysql strapi

echo "==> Αναμονή healthy Strapi (έως ~3 λεπτά)…"
deadline=$((SECONDS + 200))
while [ "$SECONDS" -lt "$deadline" ]; do
  if docker compose ps strapi 2>/dev/null | grep -q '(healthy)'; then
    break
  fi
  sleep 5
done
if ! docker compose ps strapi 2>/dev/null | grep -q '(healthy)'; then
  echo "Σφάλμα: το Strapi δεν έγινε healthy — docker compose logs strapi --tail=40"
  exit 1
fi

echo "==> 2/4 Frontend build (Strapi healthy · NODE_HEAP_MB=4096 · χρειάζεται ≥6GB RAM στο Docker/host)"
docker compose build frontend

echo "==> 3/4 Strapi rebuild (αν άλλαξε κώδικας)"
docker compose build strapi

echo "==> 4/4 Full stack up"
docker compose up -d

echo "==> Έλεγχος sitemap URL count (frontend container)"
sleep 3
count="$(docker compose exec -T frontend sh -c "grep -c '<loc>' /usr/share/nginx/html/sitemap.xml 2>/dev/null || echo 0")"
echo "Sitemap URLs στο frontend image: ${count}"
if [ "${count}" -lt 50 ] 2>/dev/null; then
  echo "Προειδοποίηση: λίγες URLs (<50) — το build δεν είδε Strapi; ξανατρέξε με healthy strapi στο :1337"
fi

echo "==> Έτοιμο."
