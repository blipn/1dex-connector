import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages/python/src"))

from onedex import OneDexClient


client = OneDexClient(
    base_url=os.environ.get("ONEDEX_BASE_URL"),
)

response = client.overview.address({
    "address": " ".join(sys.argv[1:]) or "10 rue des cordeliers aix",
    "dvf_radius_m": 600,
})
print(json.dumps(response, indent=2, ensure_ascii=False))
