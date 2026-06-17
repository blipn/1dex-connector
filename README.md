# 1dex Connector

[![CI](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml)
[![Pages](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0b7a53)](https://blipn.github.io/1dex-connector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Connecteurs clients pour consommer l'API publique 1dex: aperçu d'adresse, détails subscriber, déblocage d'adresse, usage compte, autocomplete, aperçu public, recherche commune, score public et routes cartographiques publiques vérifiées.

Ce dépôt contient le client JavaScript, le client Python, la CLI et des exemples d'intégration. Il reste une couche de consommation: il ne porte pas le contrat public de l'API, la documentation métier, les quotas, les imports de sources, le schéma de base de données, les fichiers bruts ni le code privé du runtime.

Documentation connecteur: <https://blipn.github.io/1dex-connector/>

Documentation publique canonique de l'API: <https://1dex.fr/developpeurs/api>

## Packages

- `packages/js`: client JavaScript/TypeScript sans dépendance runtime (`@1dex-fr/connector`).
- `packages/python`: client Python fondé sur la bibliothèque standard.
- `cli`: CLI Node pour les smoke tests rapides, l'aperçu d'adresse public, les détails subscriber, le score public, les suggestions et les exports JSON/CSV.
- `docs/`: notes d'usage du connecteur qui renvoient vers la documentation canonique `1dex.fr`.
- `examples/`: petits exemples curl, Node, Python et Go.

## Quickstart

JavaScript:

```js
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
});
console.log(overview.cards, score.items, details.fields);
```

Python:

```python
import os

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
details = client.address.details({
    "address": "10 rue des cordeliers aix",
    "fields": ["summary", "rail"],
})
print(overview["cards"], score["items"], details["fields"])
```

CLI:

```bash
npm i -g @1dex-fr/1dex
1dex "10 rue des cordeliers aix"
1dex score address "10 rue des cordeliers aix" -f summary
1dex details "10 rue des cordeliers aix" --fields summary,rail --api-key "$ONEDEX_API_KEY"
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
npm run ci
```

The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.
