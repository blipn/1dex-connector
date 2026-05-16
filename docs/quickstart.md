# Quickstart

## JavaScript

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient({
  baseUrl: "https://api.1dex.fr",
  apiKey: process.env.ONEDEX_API_KEY,
});

const resolved = await client.address.resolve("10 rue de la Paix, Paris");
const aggregate = await client.address.sources({
  address: "10 rue de la Paix, Paris",
  source_keys: ["cadastre", "dvf"],
});
const dvf = await client.source.query("dvf", {
  address: "10 rue de la Paix, Paris",
});
```

## Python

```python
from onedex import OneDexClient

client = OneDexClient(
    base_url="https://api.1dex.fr",
    api_key="...",
)

resolved = client.address.resolve("10 rue de la Paix, Paris")
aggregate = client.address.sources(
    address="10 rue de la Paix, Paris",
    source_keys=["cadastre", "dvf"],
)
dvf = client.source.query("dvf", address="10 rue de la Paix, Paris")
```

## CLI

```bash
1dex address resolve "10 rue de la Paix, Paris"
1dex address autocomplete "10 rue de la Paix" --limit 5
1dex address sources "10 rue de la Paix, Paris" --source-keys cadastre,dvf
1dex source query dvf --address "10 rue de la Paix, Paris"
```

Set `ONEDEX_BASE_URL` and `ONEDEX_API_KEY` instead of passing `--base-url` and `--api-key` on every command.
