# onedex

Python connector for the public 1dex map-layer endpoints.

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
```
