#!/usr/bin/env sh
set -eu

BASE_URL="${ONEDEX_BASE_URL:-https://api.1dex.fr}"

curl -sS \
  -H "Authorization: Bearer ${ONEDEX_API_KEY:-}" \
  -H "Content-Type: application/json" \
  -d '{"address":"10 rue de la Paix, Paris"}' \
  "$BASE_URL/v1/address/resolve"
