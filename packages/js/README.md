# @1dex/connector

JavaScript connector for the public 1dex map-layer endpoints.

```bash
npm i @1dex/connector
```

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient();

const response = await client.map.parcelles({
  address: "50 rue des tanneurs aix",
  viewport_render_mode: "features",
});

const dvf = await client.map.dvf({
  address: "50 rue des tanneurs aix",
  viewport_render_mode: "features",
});

console.log(response.data.features.length);
```

For command-line usage, install the `1dex` package.
