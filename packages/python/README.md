# onedex

Python connector for the public 1dex address overview and verified public map layers. Use `overview.address()` for the main address cards flow, then `map.*` helpers when you need public parcelles, DVF, works, IRIS, context, or labels layers from `1dex.fr`.

```python
from onedex import OneDexClient

client = OneDexClient()
response = client.map.parcelles({
    "address": "50 rue des tanneurs aix",
    "viewport_render_mode": "features",
})

dvf = client.map.dvf({
    "address": "50 rue des tanneurs aix",
    "viewport_render_mode": "features",
})

overview = client.overview.address({
    "address": "10 rue des cordeliers aix",
    "dvf_radius_m": 600,
})
```
