# onedex

Python connector for the public 1dex API surface. Use `overview.address()` for the main address cards flow, `autocomplete.address()` / `score.addressSuggest()` for address search, `score.*` for public score routes, `addressPages.state()` for page access state, and `map.*` helpers for public map-layer and viewport calls on `1dex.fr`.

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
