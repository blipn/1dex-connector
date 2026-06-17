# 1dex-connector

Python connector for the public 1dex API surface. Use `overview.address()` for address cards, `address.details()` / `address.unlock()` for subscriber address flows, `account.usage()` for API usage, `autocomplete.address()` / `communes.search()` / `score.addressSuggest()` for search, `score.*` for public score routes, `preview.byPath()` for public page metadata, `addressPages.state()` for page access state, and `map.*` helpers for map-layer, viewport and focus calls on `1dex.fr`.

Install the PyPI distribution with `python -m pip install 1dex-connector`; the Python import package remains `onedex`.

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
```

If `address.details()` returns `address_unlock_required`, post the non-null `normalized_address_key` alone to `address.unlock()`, or post the returned `unlock_request` object when `unlock_locator_kind` is `unlock_request`.
