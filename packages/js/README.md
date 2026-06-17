# @1dex-fr/connector

JavaScript connector for the public 1dex API surface. Use `overview.address()` for address cards, `address.details()` / `address.unlock()` for subscriber address flows, `account.usage()` for API usage, `autocomplete.address()` / `communes.search()` / `score.addressSuggest()` for search, `score.*` for public score routes, `preview.byPath()` for public page metadata, `addressPages.state()` for page access state, and `map.*` helpers for map-layer, viewport and focus calls on `1dex.fr`.

```bash
npm i @1dex-fr/connector
```

## Auth, purchase, and detailed reads

Public reads such as `overview`, `autocomplete`, `score`, and `map` do not require an API key within public quotas. Complete address details require an active professional 1dex subscription. Purchase and checkout happen on `1dex.fr`; after the professional account is active, create an API key at <https://1dex.fr/compte/api> and pass it as `apiKey` or `ONEDEX_API_KEY`.

Recommended subscriber flow:

1. Check access and remaining credits with `client.account.usage()`.
2. Try `client.address.details({ address, fields: ["summary", "rail"] })`.
3. If the API throws `address_unlock_required`, call `client.address.unlock(...)` with the returned `normalized_address_key` alone, or with `unlock_request` when provided.
4. Read the address again through the returned `details_url`.

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
const usage = await client.account.usage();

console.log(overview.cards);
console.log(suggestions.suggestions);
console.log(score.items);
console.log(Object.keys(viewport.layers));
console.log(details.fields);
console.log(usage.credits.total_remaining);
```

If `address.details()` returns `address_unlock_required`, post the non-null `normalized_address_key` alone to `address.unlock()`, or post the returned `unlock_request` object when `unlock_locator_kind` is `unlock_request`.

Subscriber helpers require an active professional API key. `account.usage()` returns API quota windows, address credit pools, active grants, recent consumptions, and subscription state; use it before batch jobs to avoid spending requests blindly.

For command-line usage, install `@1dex-fr/1dex`.
