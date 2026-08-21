#!/usr/bin/env bash
set -euo pipefail

: "${ONEDEX_API_KEY:?Set ONEDEX_API_KEY to a demo or live API key}"
: "${ONEDEX_DETAILS_REQUEST_ID:?Set one stable key for this exact details request}"
: "${ONEDEX_UNLOCK_REQUEST_ID:?Set one stable key for this exact unlock request}"

base_url="${ONEDEX_BASE_URL:-https://1dex.fr}"
address="${1:-10 rue des cordeliers aix}"

curl --get "${base_url}/api/v1/address-details" \
  -H "Authorization: Bearer ${ONEDEX_API_KEY}" \
  -H "Idempotency-Key: ${ONEDEX_DETAILS_REQUEST_ID}" \
  --data-urlencode "address=${address}" \
  --data-urlencode "fields=summary,rail"

# Reuse ONEDEX_UNLOCK_REQUEST_ID only when retrying this exact logical unlock.
curl -X POST "${base_url}/api/v1/address-unlocks" \
  -H "Authorization: Bearer ${ONEDEX_API_KEY}" \
  -H "Idempotency-Key: ${ONEDEX_UNLOCK_REQUEST_ID}" \
  -H "Content-Type: application/json" \
  --data "{\"address\":\"${address}\"}"
