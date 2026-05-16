# Quickstart

Les exemples utilisent uniquement l'endpoint public vérifié sur `https://1dex.fr`.

## JavaScript

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient();

const parcelles = await client.map.parcelles({
  addressSlug: "10-rue-des-cordeliers-aix-en-provence-13100",
  city_code: "13001",
  lon: 5.446765371857839,
  lat: 43.52966775616209,
  parcel_record_key: "13001000AS0323",
  parcel_phase: "initial",
  viewport_bbox: "5.44628,43.52926,5.44725,43.53008",
  viewport_zoom: 19.25,
  viewport_render_mode: "features",
});
```

## curl

```bash
curl "https://1dex.fr/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features" \
  -H "Accept: application/json"
```

## Python

```python
from onedex import OneDexClient

client = OneDexClient()

parcelles = client.map.parcelles({
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
```

## Go

The connector does not need a Go SDK. Use the public HTTP endpoint directly:

```go
req, err := http.NewRequest(
	"GET",
	"https://1dex.fr/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features",
	nil,
)
```

## CLI

```bash
1dex map parcelles 10-rue-des-cordeliers-aix-en-provence-13100 \
  --city-code 13001 \
  --lon 5.446765371857839 \
  --lat 43.52966775616209 \
  --parcel-record-key 13001000AS0323 \
  --parcel-phase initial \
  --viewport-bbox 5.44628,43.52926,5.44725,43.53008 \
  --viewport-zoom 19.25 \
  --viewport-render-mode features
```

Set `ONEDEX_BASE_URL` only if you need to target another environment. The public default is `https://1dex.fr`.
