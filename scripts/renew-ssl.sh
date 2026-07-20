#!/usr/bin/env bash
# Ανανέωση Let's Encrypt + reload nginx (τρέχει στο VPS, όχι μέσα σε container).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"
DOMAIN="${CERTBOT_DOMAIN:-the37n.gr}"
EXTRA_DOMAIN="${CERTBOT_WWW_DOMAIN:-www.the37n.gr}"

mkdir -p "$WEBROOT"

if ! command -v certbot >/dev/null 2>&1; then
  echo "Σφάλμα: λείπει το certbot στο host (apt install certbot)" >&2
  exit 1
fi

renew_args=(renew --webroot -w "$WEBROOT" --quiet --no-random-sleep-on-renew)

# Πρώτη φορά / ληγμένο cert: CERTBOT_FORCE=1 ./scripts/renew-ssl.sh
if [ "${CERTBOT_FORCE:-0}" = "1" ]; then
  echo "==> Force renew (webroot) για ${DOMAIN}…"
  certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" -d "$EXTRA_DOMAIN" \
    --force-renewal --non-interactive --agree-tos "${CERTBOT_EMAIL:+--email $CERTBOT_EMAIL}"
else
  if ! certbot "${renew_args[@]}"; then
    echo "==> Το renew απέτυχε — δοκίμασε: CERTBOT_FORCE=1 $0" >&2
    exit 1
  fi
fi

echo "==> Reload nginx…"
docker compose exec -T nginx nginx -s reload

echo "==> OK — $(openssl x509 -in "/etc/letsencrypt/live/${DOMAIN}/cert.pem" -noout -enddate 2>/dev/null || echo 'έλεγξε ημερομηνίες με: certbot certificates')"
