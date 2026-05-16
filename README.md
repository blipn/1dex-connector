# 1dex Connector

[![CI](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml)
[![Pages](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0b7a53)](https://blipn.github.io/1dex-connector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Open source connector to test the public 1dex parcel map-layer endpoint before discovering the full 1dex platform.

Use it for free to request the parcel layer that is publicly available on `1dex.fr` today. The repository only documents endpoints that are actually reachable from the public web.

This repository contains client connectors, a small CLI, interactive API documentation, OpenAPI documentation, and examples. It is a consumption layer only: it does not include source import workers, database schema, raw data files, or private runtime code.

Public docs: <https://blipn.github.io/1dex-connector/>

Interactive API reference: <https://blipn.github.io/1dex-connector/api.html>

Discover 1dex after testing the connector: <https://1dex.fr/>

## What works today

- Public host: `https://1dex.fr`.
- Public endpoint: `GET /adresse/{address_slug}/explore/map-layer/parcelles`.
- Public response: JSON map-layer payload with a GeoJSON `FeatureCollection`.
- No API key, account mode, or non-public endpoint is documented in this repository.

## Packages

- `packages/js`: JavaScript/TypeScript client with no runtime dependency.
- `packages/python`: Python client based on the standard library.
- `cli`: Node CLI for smoke tests and JSON/CSV output.
- `openapi/1dex-public-api.yaml`: public API contract for the verified route.
- `docs/`: quickstart, API, authentication, error, rate-limit, dataset, and example notes.

## Quickstart

JavaScript:

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient();

const response = await client.map.parcelles({
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
console.log(response.data.features.length);
```

curl:

```bash
curl "https://1dex.fr/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features" \
  -H "Accept: application/json"
```

Python:

```python
from onedex import OneDexClient

client = OneDexClient()

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
print(len(response["data"]["features"]))
```

Go:

```go
package main

req, err := http.NewRequest(
	"GET",
	"https://1dex.fr/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features",
	nil,
)
```

CLI:

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

## Implemented API Surface

The connector documents and tests the public route that works today:

- `GET /adresse/{address_slug}/explore/map-layer/parcelles`

## Development

```bash
npm run ci
```

The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.
