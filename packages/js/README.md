# @1dex-fr/connector

JavaScript and TypeScript connector for the public and professional `1dex.fr` API surface.

Install the npm package:

```bash
npm i @1dex-fr/connector
```

```js
import { OneDexClient } from "@1dex-fr/connector";
```

## Public reads

Public endpoints such as `overview`, `autocomplete`, `score`, `preview`, `communes`, and `map` can be called without an API key within public quotas.

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
```

## Auth, purchase, and detailed reads

Complete address details and unlock flows require a 1dex API key. Free demo keys are pinned to the configured demo address; live keys use the account's subscription and activation rights. Purchase and checkout still happen on `1dex.fr`. Create or manage keys at <https://1dex.fr/compte/api>.

Pass the key explicitly or through `ONEDEX_API_KEY`:

```js
import { OneDexApiError, OneDexClient } from "@1dex-fr/connector";

const client = new OneDexClient({
  apiKey: process.env.ONEDEX_API_KEY,
});
```

Recommended subscriber flow:

1. Check the V2 `api_addresses` usage view (or the legacy V1 response during rollout) with `client.account.usage()`.
2. Try `client.address.details(...)` with an address, parcel, coordinates, or a `normalizedAddressKey`, plus a caller-generated idempotency key.
3. If the API raises `address_unlock_required`, call `client.address.unlock(...)` with the returned `normalized_address_key`, or post the returned `unlock_request` object when present.
4. Follow the returned `details_url` with `client.address.detailsUrl(...)`; the helper rejects another origin or route.

```js
import { randomUUID } from "node:crypto";

const usage = await client.account.usage();

try {
  const details = await client.address.details({
    address: "10 rue des cordeliers aix",
    fields: ["summary", "rail"],
    idempotencyKey: randomUUID(),
  }, { retry: true });
  console.log(details.fields);
} catch (error) {
  if (!(error instanceof OneDexApiError)) {
    throw error;
  }
  if (error.status !== 402 || error.body?.error !== "address_unlock_required") {
    throw error;
  }

  const unlockIdempotencyKey = randomUUID();
  const unlock = error.body.unlock_request
    ? await client.address.unlock({
        ...error.body.unlock_request,
        idempotencyKey: unlockIdempotencyKey,
      }, { retry: true })
    : await client.address.unlock({
        normalizedAddressKey: error.body.normalized_address_key,
        idempotencyKey: unlockIdempotencyKey,
      }, { retry: true });

  const details = unlock.details_url
    ? await client.address.detailsUrl(unlock.details_url, {
        idempotencyKey: randomUUID(),
        retry: true,
      })
    : await client.address.details({
        normalizedAddressKey: unlock.normalized_address_key,
        fields: ["summary", "rail"],
        idempotencyKey: randomUUID(),
      }, { retry: true });

  console.log(usage.version, details.fields);
}
```

`retry: true` retries `202`, `429`, and `503` with the exact same idempotency key and honors `Retry-After`. A `409` is never retried: it means the key identifies another intention. Pass an `AbortSignal` to cancel both the active request and any retry wait.

Common professional API errors:

- `invalid_api_key`: the API key is missing, invalid, or revoked.
- `api_subscription_required`: the account needs an active subscription.
- `api_professional_required`: the endpoint requires a professional plan.
- `address_unlock_required`: the detailed address must be unlocked before reading.
- `insufficient_credits`: the account has no remaining address credits for the requested unlock.

## Helpers

The client exposes helpers for the current `/api/v1` routes:

- `client.overview.address(...)`
- `client.address.details(...)`
- `client.address.detailsUrl(...)`
- `client.address.unlock(...)`
- `client.account.usage()`
- `client.autocomplete.address(...)`
- `client.communes.search(...)`
- `client.score.address(...)`, `client.score.compare(...)`, `client.score.grid(...)`, `client.score.addressSuggest(...)`
- `client.preview.byPath(...)`
- `client.addressPages.state(...)`
- `client.map.layer(...)`, `client.map.viewport(...)`, `client.map.focus.address(...)`, `client.map.focus.publicLocation(...)`, `client.map.focus.parcelle(...)`, `client.map.focus.parcelles(...)`, `client.map.focus.feature(...)`

For command-line usage, install `@1dex-fr/1dex`.

Supported runtimes: Node 22 and 24. Type declarations cover both legacy account usage and `account-usage-v2` during rollout.
