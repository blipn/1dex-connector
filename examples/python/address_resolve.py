import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages/python/src"))

from onedex import OneDexClient


client = OneDexClient(
    base_url=os.environ.get("ONEDEX_BASE_URL"),
    api_key=os.environ.get("ONEDEX_API_KEY"),
)

response = client.address.resolve("10 rue de la Paix, Paris")
print(json.dumps(response, indent=2, ensure_ascii=False))
