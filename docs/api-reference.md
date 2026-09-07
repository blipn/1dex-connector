# Référence API

La référence canonique de l'API est servie par le runtime 1dex Explorer:

- Racine API: <https://1dex.fr/api/v1>
- OpenAPI: <https://1dex.fr/api/v1/openapi.yaml>
- Référence Swagger: <https://1dex.fr/api/v1/docs>
- Documentation développeurs: <https://1dex.fr/developpeurs/api>

Ce dépôt connecteur ne duplique pas les contrats des points d'entrée. Garder les exemples de code ici, et mettre à jour le contrat API sur `1dex.fr`. La route `address-pages/{slug}/state` reste supportée par le runtime et les helpers du connecteur, mais elle n’est pas exposée dans l’OpenAPI canonique tant que ce détail de page publique n’est pas promu en contrat documenté.

Routes canoniques couvertes par les helpers du connecteur:

- `GET /api/v1/address-overview`
- `GET /api/v1/address-details`
- `POST /api/v1/address-unlocks`
- `GET /api/v1/account/usage`
- `GET /api/v1/autocomplete/address`
- `GET /api/v1/public-preview`
- `GET /api/v1/communes/search`
- `GET /api/v1/map-layer/{layer_key}`
- `GET /api/v1/map-viewport`
- `GET /api/v1/map-focus/*`
- `POST /api/v1/score/address`
- `POST /api/v1/score/compare`
- `GET /api/v1/score/grid`
- `GET /api/v1/score/address-suggest`

## Endpoints pro abonnes

La surface pro abonnes n'est pas une API de checkout ou de gestion de compte: les pages `/compte/*`, les achats et l'administration restent des routes produit SSR. Le connecteur couvre seulement les endpoints JSON stables utilisables avec une cle API professionnelle active.

| Helper | Route | Ce que le pro obtient |
| --- | --- | --- |
| `client.address.details(...)` | `GET /api/v1/address-details` | Donnees completes par familles (`summary`, `rail`, `mobile`, `tabs`, `map_layers`, `parcel_dvf`, `sources`, `source_outcomes`, ou `all`) pour une adresse deja debloquee. |
| `client.address.unlock(...)` | `POST /api/v1/address-unlocks` | Activation explicite d’une adresse selon les droits du compte, statut `already_active`, `unlocked` ou `insufficient_credits`, puis `details_url`. |
| `client.account.usage()` | `GET /api/v1/account/usage` | Vue `account-usage-v2` des adresses API live ou demo; forme V1 encore acceptée par les clients pendant la transition. |

Flux recommande:

1. Appeler `account.usage()` pour connaître les droits et l’usage.
2. Appeler `address.details({ ..., fields, idempotencyKey })` avec une clé propre à cette intention.
3. Si l'API renvoie `address_unlock_required`, poster `normalized_address_key` seul quand `unlock_locator_kind=normalized_address_key`, sinon poster `unlock_request`, avec une nouvelle clé d'idempotence.
4. Appeler le `details_url` renvoyé via `address.detailsUrl(...)` ou `address.details_url(...)`, avec une nouvelle clé d'idempotence.

Une clé d'idempotence identifie une intention exacte: la conserver pour les rejeux de celle-ci et ne jamais la réutiliser ailleurs. Les clients proposent des tentatives bornées pour `202`, `429` et `503`; `409` reste terminal.

Erreurs d'acces a prevoir: `invalid_api_key`, `api_subscription_required`, `api_professional_required`, `address_unlock_required` et `insufficient_credits`.
