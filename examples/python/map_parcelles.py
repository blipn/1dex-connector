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
    "address_slug": "10-rue-des-cordeliers-aix-en-provence-13100",
    "city_code": "13001",
    "lon": 5.446765371857839,
    "lat": 43.52966775616209,
    "parcel_record_key": "13001000AS0323",
    "parcel_phase": "initial",
    "viewport_bbox": "5.44628,43.52926,5.44725,43.53008",
    "viewport_zoom": 19.25,
    "viewport_render_mode": "features",
})
print(json.dumps(response, indent=2, ensure_ascii=False))
