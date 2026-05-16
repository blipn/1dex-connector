import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages/python/src"))

from onedex import OneDexClient


client = OneDexClient(
    base_url=os.environ.get("ONEDEX_BASE_URL"),
)

response = client.map.parcelles({
    "address": "50 rue des tanneurs aix",
    "viewport_render_mode": "features",
})
print(json.dumps(response, indent=2, ensure_ascii=False))
