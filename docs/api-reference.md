# Référence API

Cette page ne documente que les couches publiques effectivement fonctionnelles aujourd'hui sur `1dex.fr`.

Le contrat principal est volontairement simple: envoyer une adresse française et récupérer les parcelles proches en JSON/GeoJSON, sans clé API. Des couches publiques complémentaires permettent aussi d'inspecter les signaux DVF, travaux, IRIS, contexte adresse et étiquettes lorsqu'ils sont exposés par l'Explorer.

## Base URL

```text
https://1dex.fr
```

## Endpoint

### `GET /explore/map-layer/{layer}`

Exemple vérifié:

```bash
curl "https://1dex.fr/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features" \
  -H "Accept: application/json"
curl "https://1dex.fr/explore/map-layer/parcelles_dvf?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features" \
  -H "Accept: application/json"
curl "https://1dex.fr/explore/map-layer/parcelles_travaux?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features" \
  -H "Accept: application/json"
```

Même test depuis le CLI npm:

```bash
1dex parcelles "50 rue des tanneurs aix" --format summary
1dex dvf "50 rue des tanneurs aix" --format summary
1dex travaux "50 rue des tanneurs aix" --format summary
1dex layer iris "50 rue des tanneurs aix" --format summary
1dex parcelles "50 rue des tanneurs aix" --url
```

Paramètres:

| Paramètre | Position | Obligatoire | Description |
| --- | --- | --- | --- |
| `layer` | path | oui | `parcelles`, `parcelles_dvf`, `parcelles_travaux`, `iris`, `context` ou `parcelles_labels`. |
| `address` | query | oui | Adresse saisie par l'utilisateur. |
| `city_code` | query | non | Code commune INSEE, utile si déjà connu. |
| `lon` | query | non | Longitude, utile pour éviter une résolution d'adresse. |
| `lat` | query | non | Latitude, utile pour éviter une résolution d'adresse. |
| `viewport_bbox` | query | non | Bounding box de la carte: minLon,minLat,maxLon,maxLat. |
| `viewport_zoom` | query | non | Niveau de zoom de la carte. |
| `viewport_render_mode` | query | non | Mode de rendu. La valeur vérifiée est `features`. |

## Réponse

La réponse est un payload de couche cartographique:

```json
{
  "layerKey": "parcelles",
  "label": "Parcelles",
  "summary": "500 parcelles les plus proches affichées · rayon 1 km",
  "status": "success",
  "warnings": [],
  "data": {
    "type": "FeatureCollection",
    "features": [],
    "selected_radius_meters": 1000,
    "total_parcel_count": 620,
    "visible_parcel_count": 500,
    "render_mode": "features"
  }
}
```

Le contrat OpenAPI correspondant est disponible dans [`openapi/1dex-public-api.yaml`](../openapi/1dex-public-api.yaml).
