#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${ONEDEX_BASE_URL:-https://1dex.fr}"
ADDRESS="${1:-10 rue des cordeliers aix}"

curl -sS --get "${BASE_URL%/}/api/v1/address-overview"   --data-urlencode "address=${ADDRESS}"   --data-urlencode "dvf_radius_m=600"
