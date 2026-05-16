# @1dex/connector

JavaScript connector to retrieve nearby French cadastral parcels by address. The main public layer is `parcelles`; DVF, works, IRIS, context, and labels are verified complementary public layers on `1dex.fr`.

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

For command-line usage, install `@1dex-fr/1dex`.
