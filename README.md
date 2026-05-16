# 1dex Connector

[![CI](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml)
[![Pages](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0b7a53)](https://blipn.github.io/1dex-connector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Open source CLI, API documentation, and examples to query public 1dex parcel data from an address.

Use it to search cadastral parcels around an address, generate a shareable URL, inspect the GeoJSON response, or integrate the public endpoint with curl, JavaScript, Python, or Go. The repository only documents endpoints that are actually reachable from the public web.

This repository contains client connectors, a small CLI, interactive API documentation, OpenAPI documentation, and examples. It is a consumption layer only: it does not include source import workers, database schema, raw data files, or private runtime code.

Public docs: <https://blipn.github.io/1dex-connector/>

Interactive API reference: <https://blipn.github.io/1dex-connector/api.html>

1dex platform: <https://1dex.fr/>

## What works today

- Public host: `https://1dex.fr`.
- Public endpoint: `GET /explore/map-layer/parcelles?address=...`.
- Public response: JSON map-layer payload with a GeoJSON `FeatureCollection`.
- No API key, account mode, or non-public endpoint is documented in this repository.

## Public Data Scope

- Public today: cadastral parcel features around an address through the public map-layer endpoint on `1dex.fr`.
- Developer tooling: npm CLI, curl examples, OpenAPI contract, JavaScript/Python client source, and interactive docs.
- Not exposed here: private datasets, paid workflows, exports, internal import jobs, and future private APIs.
- New surfaces should be documented only when the public contract exists and the endpoint is reachable.

## Packages

- `packages/js`: JavaScript/TypeScript client with no runtime dependency.
- `packages/python`: Python client based on the standard library.
- `cli`: Node CLI for smoke tests and JSON/CSV output.
- `openapi/1dex-public-api.yaml`: public API contract for the verified route.
- `docs/`: quickstart, API, authentication, npm publishing, error, rate-limit, dataset, and example notes.

## Quickstart

Console:

```bash
npm i @1dex-fr/1dex
npx 1dex parcelles "50 rue des tanneurs aix" -f summary
```

Pour installer la commande globalement:

```bash
npm i -g @1dex-fr/1dex
1dex parcelles "50 rue des tanneurs aix" -f summary
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
1dex parcelles "50 rue des tanneurs aix" --format summary
1dex doctor
```

CLI options:

```bash
1dex parcelles --address "50 rue des tanneurs aix" --url
1dex examples
1dex parcelles "50 rue des tanneurs aix" \
  --lon 5.446245 \
  --lat 43.52782 \
  --viewport-bbox 5.4457,43.5274,5.4468,43.5282 \
  --viewport-zoom 19 \
  --format csv
```

## npm Packages

- `@1dex-fr/1dex`: published standalone command-line package: <https://www.npmjs.com/package/@1dex-fr/1dex>. Install with `npm i @1dex-fr/1dex` and run with `npx 1dex`, or install globally with `npm i -g @1dex-fr/1dex`.
- `@1dex/connector`: JavaScript/TypeScript client source package. Publish it later when the npm scope is available.

## npm Publishing

The console package is published through npm Trusted Publishing, not a long-lived npm token.

Configure the npm package `@1dex-fr/1dex` with:

- Publisher: `GitHub Actions`
- Organization or user: `blipn`
- Repository: `1dex-connector`
- Workflow filename: `npm-publish.yml`
- Environment name: empty

Then run the GitHub Actions workflow `npm publish` manually. The workflow uses OIDC plus `npm publish --access public --provenance` from `cli/`.

## Implemented API Surface

The connector documents and tests the public route that works today:

- `GET /explore/map-layer/parcelles?address=...`

## Development

```bash
npm run ci
```

The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.
