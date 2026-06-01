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
curl "https://1dex.fr/api/v1/address-overview?city_code=13001&parcel_record_key=parcel_123&dvf_year=2024"
```

## Calque carte et viewport

```bash
curl "https://1dex.fr/api/v1/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features"
curl "https://1dex.fr/api/v1/map-viewport?layers=context,iris&address=10%20rue%20des%20cordeliers%20aix"
```

## Score public

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

Le package JS couvre les routes publiques d'aperçu, autocomplete, score, état de page adresse, calques carte et viewport:

```bash
npm i @1dex-fr/connector
```

```js
import { OneDexClient } from "@1dex-fr/connector";

const client = new OneDexClient();
const overview = await client.overview.address({
  address: "10 rue des cordeliers aix",
  dvf_radius_m: 600,
});
const suggestions = await client.autocomplete.address({
  q: "10 rue des cordeliers aix",
  limit: 5,
});
const score = await client.score.address({
  items: [{ address: "10 rue des cordeliers aix" }],
});

console.log(overview.version, suggestions.suggestions, score.items);
```

## Python

```bash
python -m pip install onedex
```

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

print(overview["version"], suggestions["suggestions"], score["items"])
```
