# Démarrage

Racine API:

```text
https://1dex.fr/api/v1
```

## Autocomplete

```bash
curl "https://1dex.fr/api/v1/autocomplete/address?q=10+rue+de+la+paix&limit=5"
curl "https://1dex.fr/api/v1/communes/search?q=aix&limit=5"
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

## Détails subscriber et déblocage

```bash
curl "https://1dex.fr/api/v1/address-details?address=10%20rue%20des%20cordeliers%20aix&fields=summary,rail" \
  -H "Authorization: Bearer $ONEDEX_API_KEY"

curl -X POST "https://1dex.fr/api/v1/address-unlocks" \
  -H "Authorization: Bearer $ONEDEX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"address":"10 rue des cordeliers aix"}'

curl "https://1dex.fr/api/v1/account/usage" \
  -H "Authorization: Bearer $ONEDEX_API_KEY"
```

Si `GET /address-details` répond `402 address_unlock_required`, lire `unlock_locator_kind`:

- `normalized_address_key`: appeler `POST /address-unlocks` avec cette clé seule.
- `unlock_request`: envoyer l'objet `unlock_request` retourné.

Après `POST /address-unlocks`, appeler le `details_url` retourné. Ne mélangez pas `normalized_address_key` avec `address`, `lon`/`lat` ou `parcel_record_key`.

## Aperçu public

```bash
curl "https://1dex.fr/api/v1/public-preview?path=/ville/aix-en-provence-13001"
```

## Calque carte et viewport

```bash
curl "https://1dex.fr/api/v1/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features"
curl "https://1dex.fr/api/v1/map-viewport?layers=context,iris&address=10%20rue%20des%20cordeliers%20aix"
curl "https://1dex.fr/api/v1/map-focus/public-location?lon=5.446766&lat=43.529667"
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

Le package JS couvre les routes publiques d'aperçu, détails subscriber, autocomplete, score, état de page adresse, calques carte, focus carte, aperçu public et viewport:

```bash
npm i @1dex-fr/connector
```

```js
import { OneDexClient } from "@1dex-fr/connector";

const client = new OneDexClient({
  apiKey: process.env.ONEDEX_API_KEY,
});
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
const details = await client.address.details({
  address: "10 rue des cordeliers aix",
  fields: ["summary", "rail"],
});

console.log(overview.version, suggestions.suggestions, score.items, details.fields);
```

## Python

```bash
python -m pip install 1dex-connector
```

```python
import os

from onedex import OneDexClient

client = OneDexClient(api_key=os.getenv("ONEDEX_API_KEY"))
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
details = client.address.details({
    "address": "10 rue des cordeliers aix",
    "fields": ["summary", "rail"],
})

print(overview["version"], suggestions["suggestions"], score["items"], details["fields"])
```
