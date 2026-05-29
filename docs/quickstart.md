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

## Score public

Les routes score publiques sont documentées dans l'OpenAPI canonique mais ne disposent pas encore de helpers dédiés dans ce dépôt connecteur. Appelez-les directement quand vous en avez besoin:

```bash
curl -X POST "https://1dex.fr/api/v1/score/address" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"address":"10 rue des cordeliers aix"}]}'

curl -X POST "https://1dex.fr/api/v1/score/compare" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"address":"10 rue des cordeliers aix"},{"address":"50 rue des tanneurs aix"}],"sortBy":"global"}'

curl "https://1dex.fr/api/v1/score/address-suggest?q=10%20rue%20des%20cordeliers%20aix&limit=5"
curl "https://1dex.fr/api/v1/score/grid?bbox=5.4457,43.5274,5.4468,43.5282&zoom=15&category=global"
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
