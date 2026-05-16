# Quickstart

Les exemples utilisent uniquement l'endpoint public vérifié sur `https://1dex.fr`.

## Console npm

```bash
npm i @1dex-fr/1dex
npx 1dex parcelles "50 rue des tanneurs aix" -f summary
```

Pour avoir la commande `1dex` disponible directement dans le terminal:

```bash
npm i -g @1dex-fr/1dex
1dex parcelles "50 rue des tanneurs aix" -f summary
```

## JavaScript

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient();

const parcelles = await client.map.parcelles({
  address: "50 rue des tanneurs aix",
  viewport_render_mode: "features",
});
```

## curl

```bash
curl "https://1dex.fr/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features" \
  -H "Accept: application/json"
```

## Python

```python
from onedex import OneDexClient

client = OneDexClient()

parcelles = client.map.parcelles({
    "address": "50 rue des tanneurs aix",
    "viewport_render_mode": "features",
})
```

## Go

The connector does not need a Go SDK. Use the public HTTP endpoint directly:

```go
req, err := http.NewRequest(
	"GET",
	"https://1dex.fr/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features",
	nil,
)
```

## CLI

```bash
1dex parcelles "50 rue des tanneurs aix" --format summary
1dex examples
1dex doctor
```

Options utiles:

```bash
1dex parcelles --address "50 rue des tanneurs aix" --url
1dex parcelles "50 rue des tanneurs aix" \
  --lon 5.446245 \
  --lat 43.52782 \
  --viewport-bbox 5.4457,43.5274,5.4468,43.5282 \
  --viewport-zoom 19 \
  --format csv
```

Set `ONEDEX_BASE_URL` only if you need to target another environment. The public default is `https://1dex.fr`.
