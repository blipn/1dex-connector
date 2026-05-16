# onedex

Python connector for the public 1dex parcel map-layer endpoint.

```python
from onedex import OneDexClient

client = OneDexClient()
response = client.map.parcelles({
    "address_slug": "10-rue-des-cordeliers-aix-en-provence-13100",
    "city_code": "13001",
    "lon": 5.446765371857839,
    "lat": 43.52966775616209,
    "viewport_render_mode": "features",
})
```
