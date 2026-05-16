# Authentication

The currently documented public map-layer endpoints on `https://1dex.fr` are anonymous:

```http
GET /explore/map-layer/{layer}?address=...
```

The verified public layers are `parcelles`, `parcelles_dvf`, `parcelles_travaux`, `iris`, `context`, and `parcelles_labels`.

The public connectors do not require an API key for these routes.
