#!/bin/sh
set -e
cd /cms
# Συγχρονισμός deps όταν αλλάζει package.json (το /cms/node_modules είναι ξεχωριστό volume).
npm install --no-audit --no-fund
exec "$@"
