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
- Public endpoint: `GET /explore/map-layer/parcelles?address=...`.
- Public response: JSON map-layer payload with a GeoJSON `FeatureCollection`.
- No API key, account mode, or non-public endpoint is documented in this repository.

## Packages

- `packages/js`: JavaScript/TypeScript client with no runtime dependency.
- `packages/python`: Python client based on the standard library.
- `cli`: Node CLI for smoke tests and JSON/CSV output.
- `openapi/1dex-public-api.yaml`: public API contract for the verified route.
- `docs/`: quickstart, API, authentication, error, rate-limit, dataset, and example notes.

## Quickstart

Console:

```bash
npm i 1dex
npx 1dex map parcelles "50 rue des tanneurs aix" \
  --viewport-render-mode features
```

Pour installer la commande globalement:

```bash
npm i -g 1dex
1dex map parcelles "50 rue des tanneurs aix" \
  --viewport-render-mode features
```

JavaScript:

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient();

const response = await client.map.parcelles({
  address: "50 rue des tanneurs aix",
  viewport_render_mode: "features",
});
console.log(response.data.features.length);
```

curl:

```bash
curl "https://1dex.fr/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features" \
  -H "Accept: application/json"
```

Python:

```python
from onedex import OneDexClient

client = OneDexClient()

response = client.map.parcelles({
    "address": "50 rue des tanneurs aix",
    "viewport_render_mode": "features",
})
print(len(response["data"]["features"]))
```

Go:

```go
package main

req, err := http.NewRequest(
	"GET",
	"https://1dex.fr/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features",
	nil,
)
```

CLI:

```bash
1dex map parcelles "50 rue des tanneurs aix" \
  --viewport-render-mode features
```

## npm Packages

- `1dex`: command-line package. Install with `npm i 1dex` and run with `npx 1dex`, or install globally with `npm i -g 1dex`.
- `@1dex/connector`: JavaScript/TypeScript client used by the CLI.

Publish `@1dex/connector` before `1dex`, because the console package depends on it.

## Implemented API Surface

The connector documents and tests the public route that works today:

- `GET /explore/map-layer/parcelles?address=...`

## Development

```bash
npm run ci
```

The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.
