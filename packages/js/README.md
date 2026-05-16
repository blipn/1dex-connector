# @1dex/connector

JavaScript connector for the public 1dex parcel map-layer endpoint.

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

console.log(response.data.features.length);
```

For command-line usage, install the `1dex` package.
