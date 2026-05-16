#!/usr/bin/env sh
set -eu

BASE_URL="${ONEDEX_BASE_URL:-https://1dex.fr}"

curl -sS \
  "$BASE_URL/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features"
