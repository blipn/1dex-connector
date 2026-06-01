# @1dex-fr/connector

JavaScript connector for the public 1dex API surface. Use `overview.address()` for the main address cards flow, `autocomplete.address()` / `score.addressSuggest()` for address search, `score.*` for public score routes, `addressPages.state()` for page access state, and `map.*` helpers for public map-layer and viewport calls on `1dex.fr`.

```bash
npm i @1dex-fr/connector
```

```js
import { OneDexClient } from "@1dex-fr/connector";

const client = new OneDexClient();

const overview = await client.overview.address({
  address: "10 rue des cordeliers aix",
  dvf_radius_m: 600,
});

const suggestions = await client.autocomplete.address({
  q: "10 rue des cordeliers aix",
  limit: 5,
});

const score = await client.score.address({
  items: [{ address: "10 rue des cordeliers aix" }],
});

const viewport = await client.map.viewport({
  layers: "context,iris",
  address: "10 rue des cordeliers aix",
});

console.log(overview.cards);
console.log(suggestions.suggestions);
console.log(score.items);
console.log(Object.keys(viewport.layers));
```

For command-line usage, install `@1dex-fr/1dex`.
