# @1dex-fr/connector

JavaScript connector for the public 1dex API surface. Use `overview.address()` for address cards, `address.details()` / `address.unlock()` for subscriber address flows, `account.usage()` for API usage, `autocomplete.address()` / `communes.search()` / `score.addressSuggest()` for search, `score.*` for public score routes, `preview.byPath()` for public page metadata, `addressPages.state()` for page access state, and `map.*` helpers for map-layer, viewport and focus calls on `1dex.fr`.

```bash
npm i @1dex-fr/connector
```

```js
import { OneDexClient } from "@1dex-fr/connector";

const client = new OneDexClient({
  apiKey: process.env.ONEDEX_API_KEY,
});

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

const details = await client.address.details({
  address: "10 rue des cordeliers aix",
  fields: ["summary", "rail"],
});

console.log(overview.cards);
console.log(suggestions.suggestions);
console.log(score.items);
console.log(Object.keys(viewport.layers));
console.log(details.fields);
```

If `address.details()` returns `address_unlock_required`, post the non-null `normalized_address_key` alone to `address.unlock()`, or post the returned `unlock_request` object when `unlock_locator_kind` is `unlock_request`.

For command-line usage, install `@1dex-fr/1dex`.
