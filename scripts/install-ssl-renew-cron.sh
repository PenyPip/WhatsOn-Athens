#!/usr/bin/env bash
# Μία φορά στο VPS (ως root): εγκαθιστά cron για αυτόματο renew Let's Encrypt.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RENEW="$ROOT/scripts/renew-ssl.sh"
LOG="/var/log/whatson-certbot-renew.log"
CRON_LINE="0 3 * * * $RENEW >> $LOG 2>&1"

chmod +x "$RENEW"

if ! command -v certbot >/dev/null 2>&1; then
  echo "Εγκατάσταση certbot…"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update && apt-get install -y certbot
  else
    echo "Εγκατάστησε χειροκίνητα το certbot και ξανατρέξε αυτό το script." >&2
    exit 1
  fi
fi

mkdir -p /var/www/certbot

if crontab -l 2>/dev/null | grep -Fq "$RENEW"; then
  echo "Το cron για renew υπάρχει ήδη."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "Προστέθηκε cron: $CRON_LINE"
fi

echo ""
echo "Τώρα (αν το SSL έχει λήξει):"
echo "  cd $ROOT && docker compose up -d nginx"
echo "  CERTBOT_FORCE=1 $RENEW"
echo ""
echo "Έλεγχος: certbot certificates"
