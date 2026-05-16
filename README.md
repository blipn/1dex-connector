# 1dex Connector

[![CI](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml)
[![Pages](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0b7a53)](https://blipn.github.io/1dex-connector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Premier connecteur gratuit 1dex pour tester une couche de données autour d'une adresse française.

Objectif: permettre aux développeurs, agences, proptechs et curieux de récupérer les parcelles proches d'une adresse en JSON/GeoJSON, sans clé API. Le connecteur part d'un cas simple et vérifiable: une adresse en entrée, une couche parcellaire exploitable en sortie.

Pourquoi ce repo existe: une décision immobilière ne dépend pas d'une seule donnée. Prix, cadastre, risques, urbanisme, environnement, services, sources et limites restent encore trop dispersés. 1dex vise à rassembler les données utiles d'une adresse dans un outil clair, sourcé et exploitable.

Le connecteur gratuit est la première porte d'entrée. L'API avancée sera ouverte progressivement sur des cas d'usage cadrés: agences, CGP, proptechs, outils patrimoniaux, cartographie et agents IA immobiliers.

This repository contains client connectors, a small CLI, interactive API documentation, OpenAPI documentation, and examples. It is a consumption layer only: it does not include source import workers, database schema, raw data files, or private runtime code.

Public docs: <https://blipn.github.io/1dex-connector/>

Interactive API reference: <https://blipn.github.io/1dex-connector/api.html>

1dex platform: <https://1dex.fr/>

## What Works Today

- Public host: `https://1dex.fr`.
- Public endpoint: `GET /explore/map-layer/{layer}?address=...`.
- Main free connector layer: `parcelles`, to retrieve nearby cadastral parcels from a French address.
- Verified complementary public layers: `parcelles_dvf`, `parcelles_travaux`, `iris`, `context`, `parcelles_labels`.
- Public response: JSON map-layer payload with a GeoJSON `FeatureCollection`.
- No API key, account mode, or non-public endpoint is documented in this repository.

## Public Data Scope

- Public today: cadastral parcel features around an address, with verified complementary public layers for DVF parcel signals, active works parcel signals, IRIS, address context, and parcel labels through public map-layer endpoints on `1dex.fr`.
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
npx 1dex dvf "50 rue des tanneurs aix" -f summary
npx 1dex travaux "50 rue des tanneurs aix" -f summary
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

const dvf = await client.map.dvf({
  address: "50 rue des tanneurs aix",
  viewport_render_mode: "features",
});
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
1dex dvf "50 rue des tanneurs aix" --format summary
1dex travaux "50 rue des tanneurs aix" --format summary
1dex doctor
```

CLI options:

```bash
1dex parcelles --address "50 rue des tanneurs aix" --url
1dex layer iris "50 rue des tanneurs aix" --format summary
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
- Environment name: `npm`

After `cli/package.json` is bumped and pushed, the GitHub Actions workflow `npm publish` runs automatically for `cli/**` changes. It can also be started manually. The workflow uses OIDC plus `npm publish --access public --provenance` from `cli/`, and skips versions that already exist on npm.

## Implemented API Surface

The connector documents and tests the public map-layer routes that work today:

- `GET /explore/map-layer/parcelles?address=...`
- `GET /explore/map-layer/parcelles_dvf?address=...`
- `GET /explore/map-layer/parcelles_travaux?address=...`
- `GET /explore/map-layer/iris?address=...`
- `GET /explore/map-layer/context?address=...`
- `GET /explore/map-layer/parcelles_labels?address=...`

## Development

```bash
npm run ci
```

The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.
