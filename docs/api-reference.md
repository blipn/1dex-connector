# API Reference

See [openapi/1dex-public-api.yaml](../openapi/1dex-public-api.yaml) for the machine-readable contract.

## `GET /v1/address/autocomplete`

Returns address suggestions for a query string.

Query parameters:

- `q`: string, at least 3 characters.
- `limit`: integer between 1 and 8, default `5`.

## `POST /v1/address/resolve`

Resolves one address or reverse-resolves one coordinate pair.

Body:

```json
{
  "address": "10 rue de la Paix, Paris"
}
```

Alternative body:

```json
{
  "coordinates": {
    "lon": 2.3316,
    "lat": 48.8686
  }
}
```

## `POST /v1/address/sources`

Resolves one address or point, derives source-specific payloads, then fans out over selected public sources.

Body:

```json
{
  "address": "10 rue de la Paix, Paris",
  "source_keys": ["cadastre", "dvf"],
  "source_overrides": {
    "cadastre": {
      "radius_meters": 120,
      "page_size": 5
    }
  }
}
```

## `POST /v1/address/sources/{source_key}`

Queries one approved source with either canonical address/coordinates input or the source-native payload.

Body:

```json
{
  "address": "10 rue de la Paix, Paris"
}
```

## Response Envelope

All query responses use:

```json
{
  "request_id": "uuid",
  "query": {
    "normalized_address": null,
    "match_score": null
  },
  "status": "ok",
  "source": {
    "source_key": "address-resolution",
    "dataset_updated_at": null,
    "method": "internal_component",
    "limitations": []
  },
  "data": {},
  "warnings": [],
  "meta": {
    "pagination": null
  }
}
```
