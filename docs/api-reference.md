# Référence API

Cette page ne documente que l'endpoint public effectivement fonctionnel aujourd'hui sur `1dex.fr`.

La route vérifiée renvoie les parcelles visibles autour d'une adresse.

## Base URL

```text
https://1dex.fr
```

## Endpoint

### `GET /explore/map-layer/parcelles`

Exemple vérifié:

```bash
curl "https://1dex.fr/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features" \
  -H "Accept: application/json"
```

Même test depuis le CLI npm:

```bash
1dex parcelles "50 rue des tanneurs aix" --format summary
1dex parcelles "50 rue des tanneurs aix" --url
```

Paramètres:

| Paramètre | Position | Obligatoire | Description |
| --- | --- | --- | --- |
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
