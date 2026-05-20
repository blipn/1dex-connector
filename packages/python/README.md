# onedex

Python connector to retrieve nearby French cadastral parcels by address. The main public layer is `parcelles`; DVF, works, IRIS, context, and labels are verified complementary public layers on `1dex.fr`.

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
