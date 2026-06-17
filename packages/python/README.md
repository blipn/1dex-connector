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

Public endpoints such as `overview`, `autocomplete`, `score`, `preview`, `communes`, and `map` can be called without an API key within public quotas.

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

## Auth, purchase, and detailed reads

Complete address details and unlock flows require an active professional 1dex subscription. Purchase and checkout happen on `1dex.fr`; once the professional account is active, create an API key at <https://1dex.fr/compte/api>.

Pass the key explicitly or through `ONEDEX_API_KEY`:

```python
import os

from onedex import OneDexApiError, OneDexClient

client = OneDexClient(api_key=os.getenv("ONEDEX_API_KEY"))
```

Recommended subscriber flow:

1. Check subscription state, quota windows, credits, active grants, and recent consumptions with `client.account.usage()`.
2. Try `client.address.details(...)` with an address, parcel, coordinates, or a `normalized_address_key`.
3. If the API raises `address_unlock_required`, call `client.address.unlock(...)` with the returned `normalized_address_key`, or post the returned `unlock_request` object when present.
4. Read the detailed address again, or follow the returned `details_url`.

```python
usage = client.account.usage()

try:
    details = client.address.details({
        "address": "10 rue des cordeliers aix",
        "fields": ["summary", "rail"],
    })
except OneDexApiError as error:
    if error.status != 402 or error.body.get("error") != "address_unlock_required":
        raise

    unlock_request = error.body.get("unlock_request")
    if unlock_request:
        unlock = client.address.unlock(unlock_request)
    else:
        unlock = client.address.unlock({
            "normalized_address_key": error.body["normalized_address_key"],
        })

    details_url = unlock.get("details_url")
    if details_url:
        details = client.request("GET", details_url)
    else:
        details = client.address.details({
            "normalized_address_key": unlock["normalized_address_key"],
            "fields": ["summary", "rail"],
        })
```

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
- `client.address.unlock(...)`
- `client.account.usage()`
- `client.autocomplete.address(...)`
- `client.communes.search(...)`
- `client.score.address(...)`, `client.score.compare(...)`, `client.score.grid(...)`, `client.score.addressSuggest(...)`
- `client.preview.byPath(...)`
- `client.addressPages.state(...)`
- `client.map.layer(...)`, `client.map.viewport(...)`, `client.map.focus.address(...)`, `client.map.focus.public_location(...)`, `client.map.focus.publicLocation(...)`, `client.map.focus.parcelle(...)`, `client.map.focus.parcelles(...)`, `client.map.focus.feature(...)`
