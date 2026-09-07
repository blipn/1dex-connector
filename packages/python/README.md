# 1dex-connector

Python connector for the public and professional `1dex.fr` API surface.

Install the PyPI distribution:

```bash
python -m pip install 1dex-connector
```

The distribution name is `1dex-connector`; the Python import package is `onedex`.

```python
from onedex import OneDexClient
```

## Public reads

Public overview access is intended for manual, one-off checks within public quotas. Automation and integrations require active API rights. Some map layers also require an authorized Explorer session; an API key alone does not grant access to detailed DVF or works layers.

```python
from onedex import OneDexClient

client = OneDexClient()

overview = client.overview.address({
    "address": "10 rue des cordeliers aix",
    "dvf_radius_m": 600,
})

suggestions = client.autocomplete.address({
    "q": "10 rue des cordeliers aix",
    "limit": 5,
})

score = client.score.address({
    "items": [{"address": "10 rue des cordeliers aix"}],
})

viewport = client.map.viewport({
    "layers": "context,iris",
    "address": "10 rue des cordeliers aix",
})
```

## Authentication and detailed reads

Complete address details and unlock flows require a 1dex API key. Professional Free accounts can issue a demo key only when a demo is published in that environment. Demo keys are pinned to the configured address; live keys use the account's subscription and activation rights. Check current offer availability on `1dex.fr`. Keep live keys in your backend, never in browser code or URLs. Create or manage keys at <https://1dex.fr/compte/api>.

Pass the key explicitly or through `ONEDEX_API_KEY`:

```python
import os

from onedex import OneDexApiError, OneDexClient

client = OneDexClient(api_key=os.getenv("ONEDEX_API_KEY"))
```

Recommended subscriber flow:

1. Check the V2 `api_addresses` usage view (or the legacy V1 response during rollout) with `client.account.usage()`.
2. Try `client.address.details(...)` with an address, parcel, coordinates, or a `normalized_address_key`, plus a caller-generated idempotency key.
3. If the API raises `address_unlock_required`, call `client.address.unlock(...)` with the returned `normalized_address_key`, or post the returned `unlock_request` object when present.
4. Follow the returned `details_url` with `client.address.details_url(...)`; the helper rejects another origin or route.

```python
import uuid

usage = client.account.usage()

try:
    details = client.address.details(
        address="10 rue des cordeliers aix",
        fields=["summary", "rail"],
        idempotency_key=str(uuid.uuid4()),
        max_attempts=3,
    )
except OneDexApiError as error:
    if error.status != 402 or error.body.get("error") != "address_unlock_required":
        raise

    unlock_request = error.body.get("unlock_request")
    if unlock_request:
        unlock = client.address.unlock(
            unlock_request,
            idempotency_key=str(uuid.uuid4()),
            max_attempts=3,
        )
    else:
        unlock = client.address.unlock(
            normalized_address_key=error.body["normalized_address_key"],
            idempotency_key=str(uuid.uuid4()),
            max_attempts=3,
        )

    details_url = unlock.get("details_url")
    if details_url:
        details = client.address.details_url(
            details_url,
            idempotency_key=str(uuid.uuid4()),
            max_attempts=3,
        )
    else:
        details = client.address.details(
            normalized_address_key=unlock["normalized_address_key"],
            fields=["summary", "rail"],
            idempotency_key=str(uuid.uuid4()),
            max_attempts=3,
        )
```

Set `max_attempts` above 1 to retry `202`, `429`, and `503` with the exact same key while honoring `Retry-After`. A `409` is terminal. A `threading.Event` passed as `cancel_event` cancels before the call or between retry attempts.

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
- `client.address.details_url(...)`, `client.address.detailsUrl(...)`
- `client.address.unlock(...)`
- `client.account.usage()`
- `client.autocomplete.address(...)`
- `client.communes.search(...)`
- `client.score.address(...)`, `client.score.compare(...)`, `client.score.grid(...)`, `client.score.addressSuggest(...)`
- `client.preview.byPath(...)`
- `client.addressPages.state(...)`
- `client.map.layer(...)`, `client.map.viewport(...)`, `client.map.focus.address(...)`, `client.map.focus.public_location(...)`, `client.map.focus.publicLocation(...)`, `client.map.focus.parcelle(...)`, `client.map.focus.parcelles(...)`, `client.map.focus.feature(...)`

Supported runtimes: Python 3.10 and newer.

## Transport limits

The base URL accepts either `https://1dex.fr` or `https://1dex.fr/api/v1`. HTTP redirects are rejected so credentials and mutations are never forwarded to an unexpected URL. A retry wait budget stops retries when `Retry-After` exceeds it; it never shortens the server’s delay. Errors retain the HTTP status even when an upstream response contains text or HTML.
