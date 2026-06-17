import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages/python/src"))

from onedex import OneDexApiError, OneDexClient


api_key = os.getenv("ONEDEX_API_KEY")
if not api_key:
    raise SystemExit("Set ONEDEX_API_KEY before calling subscriber endpoints.")

address = " ".join(sys.argv[1:]) or "10 rue des cordeliers aix"
client = OneDexClient(
    base_url=os.getenv("ONEDEX_BASE_URL"),
    api_key=api_key,
)

fields = ["summary", "rail"]
usage = client.account.usage()
print("credits_remaining=", usage.get("credits", {}).get("total_remaining", ""))

try:
    details = client.address.details({"address": address, "fields": fields})
    print(json.dumps(details, indent=2, ensure_ascii=False))
except OneDexApiError as error:
    if error.status != 402 or not isinstance(error.body, dict) or error.body.get("error") != "address_unlock_required":
        raise

    if os.getenv("ONEDEX_UNLOCK") != "1":
        print(
            "Address is locked. Re-run with ONEDEX_UNLOCK=1 to consume one address credit when needed.",
            file=sys.stderr,
        )
        print(json.dumps(error.body, indent=2, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(2)

    unlock_request = error.body.get("unlock_request")
    if unlock_request:
        unlock = client.address.unlock(unlock_request)
    else:
        unlock = client.address.unlock({"normalized_address_key": error.body["normalized_address_key"]})

    details_url = unlock.get("details_url")
    if details_url:
        details = client.request("GET", details_url)
    else:
        details = client.address.details({
            "normalized_address_key": unlock["normalized_address_key"],
            "fields": fields,
        })

    print(json.dumps(details, indent=2, ensure_ascii=False))
