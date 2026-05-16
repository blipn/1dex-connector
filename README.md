# 1dex Connector

[![CI](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml)
[![Pages](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0b7a53)](https://blipn.github.io/1dex-connector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Public developer kit for consuming public-data answers from the 1dex API.

This repository contains client connectors, a small CLI, OpenAPI documentation, and examples. It is a consumption layer only: it does not include source import workers, database schema, raw data files, or private runtime code.

Public docs: <https://blipn.github.io/1dex-connector/>

1dex product site: <https://1dex.fr/>

## Packages

- `packages/js`: JavaScript/TypeScript client with no runtime dependency.
- `packages/python`: Python client based on the standard library.
- `cli`: Node CLI for smoke tests and JSON/CSV export.
- `openapi/1dex-public-api.yaml`: public API contract draft.
- `docs/`: quickstart, API, authentication, error, rate-limit, dataset, and example notes.

## Quickstart

JavaScript:

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient({
  baseUrl: "https://api.1dex.fr",
  apiKey: process.env.ONEDEX_API_KEY,
});

const response = await client.address.resolve("10 rue de la Paix, Paris");
console.log(response.data);
```

Python:

```python
import os
from onedex import OneDexClient

client = OneDexClient(
    base_url="https://api.1dex.fr",
    api_key=os.environ.get("ONEDEX_API_KEY"),
)

response = client.address.resolve("10 rue de la Paix, Paris")
print(response["data"])
```

CLI:

```bash
ONEDEX_API_KEY=... npx 1dex address resolve "10 rue de la Paix, Paris"
```

## Implemented API Surface

The initial connector covers the public candidate routes:

- `GET /v1/address/autocomplete`
- `POST /v1/address/resolve`
- `POST /v1/address/sources`
- `POST /v1/address/sources/{source_key}`

`GET /v1/datasets` is included in the OpenAPI draft and connector shape as the public dataset catalog contract.

## Development

```bash
npm run ci
```

The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.
