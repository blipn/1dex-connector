# Démarrage

Racine API:

```text
https://1dex.fr/api/v1
```

## Autocomplete

```bash
curl "https://1dex.fr/api/v1/autocomplete/address?q=10+rue+de+la+paix&limit=5"
```

## État d'une page adresse

```bash
curl "https://1dex.fr/api/v1/address-pages/10-rue-de-la-paix-paris-75002/state"
```

## Aperçu adresse

```bash
curl "https://1dex.fr/api/v1/address-overview?address=10%20rue%20des%20cordeliers%20aix&dvf_radius_m=600"
```

## Focus géographique public

```bash
curl "https://1dex.fr/api/v1/map-focus/public-location?lon=2.3317&lat=48.8686"
```

## JavaScript

Les packages du connecteur restent volontairement de petits clients HTTP. Lorsque les helpers de haut niveau ne couvrent pas encore une route `/api/v1`, appelez directement les points d'entrée publics:

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient();
const overview = await client.overview.address({
  address: "10 rue des cordeliers aix",
  dvf_radius_m: 600,
});

console.log(overview.version, overview.cards);
```

## Python

```python
from onedex import OneDexClient

client = OneDexClient()
overview = client.overview.address({
    "address": "10 rue des cordeliers aix",
    "dvf_radius_m": 600,
})

print(overview["version"], overview["cards"])
```
