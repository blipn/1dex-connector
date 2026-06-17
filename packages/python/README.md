# 1dex-connector

Python connector for the public 1dex API surface. Use `overview.address()` for address cards, `address.details()` / `address.unlock()` for subscriber address flows, `account.usage()` for API usage, `autocomplete.address()` / `communes.search()` / `score.addressSuggest()` for search, `score.*` for public score routes, `preview.byPath()` for public page metadata, `addressPages.state()` for page access state, and `map.*` helpers for map-layer, viewport and focus calls on `1dex.fr`.

Install the PyPI distribution with `python -m pip install 1dex-connector`; the Python import package remains `onedex`.

## Auth, purchase, and detailed reads

Public reads such as `overview`, `autocomplete`, `score`, and `map` do not require an API key within public quotas. Complete address details require an active professional 1dex subscription. Purchase and checkout happen on `1dex.fr`; after the professional account is active, create an API key at <https://1dex.fr/compte/api> and pass it as `api_key` or `ONEDEX_API_KEY`.

Recommended subscriber flow:

1. Check access and remaining credits with `client.account.usage()`.
2. Try `client.address.details({"address": "...", "fields": ["summary", "rail"]})`.
3. If the API raises `address_unlock_required`, call `client.address.unlock(...)` with the returned `normalized_address_key` alone, or with `unlock_request` when provided.
4. Read the address again through the returned `details_url`.

```python
import os

from onedex import OneDexClient

client = OneDexClient(api_key=os.getenv("ONEDEX_API_KEY"))
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

details = client.address.details({
    "address": "10 rue des cordeliers aix",
    "fields": ["summary", "rail"],
})
usage = client.account.usage()
```

If `address.details()` returns `address_unlock_required`, post the non-null `normalized_address_key` alone to `address.unlock()`, or post the returned `unlock_request` object when `unlock_locator_kind` is `unlock_request`.

Subscriber helpers require an active professional API key. `client.account.usage()` returns API quota windows, address credit pools, active grants, recent consumptions, and subscription state; use it before batch jobs to avoid spending requests blindly.
