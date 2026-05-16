# Référence API

Cette page ne documente que l'endpoint public effectivement fonctionnel aujourd'hui sur `1dex.fr`.

La route vérifiée renvoie les parcelles visibles autour d'une adresse et d'une vue carte.

## Base URL

```text
https://1dex.fr
```

## Endpoint

### `GET /adresse/{address_slug}/explore/map-layer/parcelles`

Exemple vérifié:

```bash
curl "https://1dex.fr/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features" \
  -H "Accept: application/json"
```

Paramètres:

| Paramètre | Position | Obligatoire | Description |
| --- | --- | --- | --- |
| `address_slug` | path | oui | Slug d'adresse utilisé dans l'URL 1dex. |
| `city_code` | query | oui | Code commune INSEE. |
| `lon` | query | oui | Longitude du point d'exploration. |
| `lat` | query | oui | Latitude du point d'exploration. |
| `parcel_record_key` | query | non | Parcelle d'ancrage quand elle est connue. |
| `parcel_phase` | query | non | Phase de chargement, par exemple `initial`. |
| `viewport_bbox` | query | non | Bounding box de la carte: minLon,minLat,maxLon,maxLat. |
| `viewport_zoom` | query | non | Niveau de zoom de la carte. |
| `viewport_render_mode` | query | non | Mode de rendu. La valeur vérifiée est `features`. |

## Réponse

La réponse est un payload de couche cartographique:

```json
{
  "layerKey": "parcelles",
  "label": "Parcelles",
  "summary": "54 premières parcelles affichées...",
  "status": "success",
  "warnings": [],
  "data": {
    "type": "FeatureCollection",
    "features": [],
    "selected_radius_meters": 300,
    "total_parcel_count": 54,
    "visible_parcel_count": 54,
    "render_mode": "features"
  }
}
```

Le contrat OpenAPI correspondant est disponible dans [`openapi/1dex-public-api.yaml`](../openapi/1dex-public-api.yaml).
