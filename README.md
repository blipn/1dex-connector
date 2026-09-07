# 1dex Connector

[![CI](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml)
[![Pages](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0b7a53)](https://blipn.github.io/1dex-connector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Connecteurs clients pour consommer l'API publique 1dex: aperçu d'adresse, détails authentifiés, déblocage idempotent, usage compte, autocomplete, aperçu public, recherche commune, score public et routes cartographiques vérifiées.

Ce dépôt contient le client JavaScript, le client Python, la CLI et des exemples d'intégration. Il reste une couche de consommation: il ne porte pas le contrat public de l'API, la documentation métier, les quotas, les imports de sources, le schéma de base de données, les fichiers bruts ni le code privé du runtime.

Documentation connecteur: <https://blipn.github.io/1dex-connector/>

Documentation publique canonique de l'API: <https://1dex.fr/developpeurs/api>

## Auth, démo et lecture détaillée

L’aperçu public permet une vérification manuelle ponctuelle sans clé, dans les quotas publics. Toute intégration ou automatisation exige un droit API actif. Certaines couches de carte nécessitent en plus une session Explorer autorisée : une clé API seule ne les débloque pas. Un compte professionnel Free peut créer une clé démo seulement lorsque la démonstration est publiée sur son environnement ; elle reste limitée à l’adresse épinglée. Le serveur décide des droits, sans déduction du client depuis le préfixe de clé.

Le connecteur ne gère ni l’achat ni le checkout. La disponibilité des offres et des clés se vérifie sur `1dex.fr`. Une clé live reste dans votre backend ou vos variables d’environnement, jamais dans un navigateur ou une URL. Créez la clé sur <https://1dex.fr/compte/api>, puis passez-la avec `apiKey`, `api_key`, `--api-key` ou `ONEDEX_API_KEY`. Les clients envoient `Authorization: Bearer <clé>`.

Flux recommande pour une integration pro:

1. Vérifier les droits et l’usage avec `account.usage()` (`GET /api/v1/account/usage`).
2. Générer une clé d'idempotence et tenter `address.details({ address, fields, idempotencyKey })` (`GET /api/v1/address-details`).
3. Si l'API renvoie `402 address_unlock_required`, lire `unlock_locator_kind`.
4. Appeler `address.unlock(...)` (`POST /api/v1/address-unlocks`) avec une nouvelle clé d'idempotence et `normalized_address_key` seul quand il est fourni, sinon avec l'objet `unlock_request`.
5. Relire l'adresse via le helper sûr `address.detailsUrl(details_url, ...)`, avec une nouvelle clé d'idempotence.

Une même intention doit conserver exactement la même clé lors d'un rejeu. Les clients peuvent réessayer `202`, `429` et `503` en respectant `Retry-After`; `409` signale au contraire un conflit terminal. L'annulation de l'appelant interrompt aussi l'attente entre les tentatives.

Ce que couvrent les helpers pro:

- `address.details`: familles completes d'une adresse debloquee (`summary`, `rail`, `mobile`, `tabs`, `map_layers`, `parcel_dvf`, `sources`, `source_outcomes` ou `all`).
- `address.unlock`: activation explicite selon les droits du compte, statut `already_active`, `unlocked` ou `insufficient_credits`, puis `details_url`.
- `account.usage`: réponse courante `account-usage-v2` (`api_addresses` live ou démo). La fenêtre démo est glissante ; les champs de stock et de lots sont facultatifs selon le mode serveur. La forme V1 reste typée pour les anciennes installations.

Erreurs d'acces a prevoir: `invalid_api_key`, `api_subscription_required`, `api_professional_required`, `address_unlock_required`, et `insufficient_credits` quand aucun credit adresse n'est disponible.

## Packages

- `packages/js`: client JavaScript/TypeScript sans dépendance runtime (`@1dex-fr/connector`).
- `packages/python`: client Python fondé sur la bibliothèque standard.
- `cli`: CLI Node pour les smoke tests rapides, l'aperçu d'adresse public, les détails pro abonnés, le score public, les suggestions et les exports JSON/CSV.
- `docs/`: notes d'usage du connecteur qui renvoient vers la documentation canonique `1dex.fr`.
- `examples/`: petits exemples curl, Node, Python et Go.

## Quickstart

JavaScript:

```js
import { randomUUID } from "node:crypto";
import { OneDexClient } from "@1dex-fr/connector";

const client = new OneDexClient({
  baseUrl: "https://1dex.fr",
  apiKey: process.env.ONEDEX_API_KEY,
});

const overview = await client.overview.address({
  address: "10 rue des cordeliers aix",
  dvf_radius_m: 600,
});
const score = await client.score.address({
  items: [{ address: "10 rue des cordeliers aix" }],
});
const details = await client.address.details({
  address: "10 rue des cordeliers aix",
  fields: ["summary", "rail"],
  idempotencyKey: randomUUID(),
}, { retry: true });
console.log(overview.cards, score.items, details.fields);
```

Python:

```python
import os
import uuid

from onedex import OneDexClient

client = OneDexClient(
    base_url="https://1dex.fr",
    api_key=os.getenv("ONEDEX_API_KEY"),
)

overview = client.overview.address({
    "address": "10 rue des cordeliers aix",
    "dvf_radius_m": 600,
})
score = client.score.address({
    "items": [{"address": "10 rue des cordeliers aix"}],
})
details = client.address.details(
    address="10 rue des cordeliers aix",
    fields=["summary", "rail"],
    idempotency_key=str(uuid.uuid4()),
    max_attempts=3,
)
print(overview["cards"], score["items"], details["fields"])
```

CLI:

```bash
npm i -g @1dex-fr/1dex
1dex "10 rue des cordeliers aix"
1dex score address "10 rue des cordeliers aix" -f summary
1dex address details "10 rue des cordeliers aix" --fields summary,rail --idempotency-key "$ONEDEX_DETAILS_REQUEST_ID" --api-key "$ONEDEX_API_KEY" --max-attempts 3
```

## Liens publics canoniques de l'API

- Racine API: <https://1dex.fr/api/v1>
- Documentation machine: <https://1dex.fr/api/v1/openapi.yaml>
- Référence Swagger: <https://1dex.fr/api/v1/docs>
- Accès aux clés API: <https://1dex.fr/compte/api>
- Documentation métier: <https://1dex.fr/developpeurs/api#donnees>
- Limites d’appels: <https://1dex.fr/developpeurs/api/quotas>

Le site GitHub Pages pointe volontairement vers ces documents runtime au lieu de dupliquer les points d'entrée, les quotas ou la documentation métier.

## Development

```bash
npm ci --ignore-scripts
npm run ci
```

The supported runtime matrix is Node 22/24 and Python 3.10+. The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.

## Version 0.2.0

Les lectures détaillées et activations exigent maintenant une clé d’idempotence fournie par l’appelant. Python nécessite 3.10 ou plus. La CLI dépend du même SDK JavaScript pour garder un seul transport HTTP. `baseUrl` / `base_url` accepte `https://1dex.fr` ou la racine documentée `https://1dex.fr/api/v1`.
