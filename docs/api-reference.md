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
| `client.address.unlock(...)` | `POST /api/v1/address-unlocks` | Deblocage d'une adresse avec consommation d'un credit si necessaire, statut `already_active`, `unlocked` ou `insufficient_credits`, puis `details_url`. |
| `client.account.usage()` | `GET /api/v1/account/usage` | Quotas API minute/heure/jour, credits adresse, pools de credits, grants actifs, consommations recentes et abonnement courant. |

Flux recommande:

1. Appeler `account.usage()` pour connaitre quotas et credits.
2. Appeler `address.details({ ..., fields })`.
3. Si l'API renvoie `address_unlock_required`, poster `normalized_address_key` seul quand `unlock_locator_kind=normalized_address_key`, sinon poster `unlock_request`.
4. Appeler le `details_url` renvoye par `address.unlock(...)`.

Erreurs d'acces a prevoir: `invalid_api_key`, `api_subscription_required`, `api_professional_required`, `address_unlock_required` et `insufficient_credits`.
