# onedex

Python connector for the 1dex public API.

```python
from onedex import OneDexClient

client = OneDexClient(base_url="https://api.1dex.fr", api_key="...")
response = client.address.resolve("10 rue de la Paix, Paris")
```
