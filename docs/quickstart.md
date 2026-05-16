# Quickstart

Les exemples utilisent uniquement l'endpoint public vérifié sur `https://1dex.fr`.

## Console npm

```bash
npm i @1dex-fr/1dex
npx 1dex map parcelles "50 rue des tanneurs aix" \
  --viewport-render-mode features
```

Pour avoir la commande `1dex` disponible directement dans le terminal:

```bash
npm i -g @1dex-fr/1dex
1dex map parcelles "50 rue des tanneurs aix" \
  --viewport-render-mode features
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
1dex map parcelles "50 rue des tanneurs aix" \
  --viewport-render-mode features
```

Set `ONEDEX_BASE_URL` only if you need to target another environment. The public default is `https://1dex.fr`.
