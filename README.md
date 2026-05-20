# 1dex Connector

[![CI](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/ci.yml)
[![Pages](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml/badge.svg)](https://github.com/blipn/1dex-connector/actions/workflows/pages.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0b7a53)](https://blipn.github.io/1dex-connector/)
[![License: MIT](https://img.shields.io/badge/License-MIT-111827.svg)](LICENSE)

Connecteurs clients pour consommer les réponses publiques de l'API 1dex Explorer.

Ce dépôt contient le client JavaScript, le client Python, la CLI et des exemples d'intégration. Il reste une couche de consommation: il ne porte pas le contrat public de l'API, la documentation métier, les quotas, les imports de sources, le schéma de base de données, les fichiers bruts ni le code privé du runtime.

Documentation connecteur: <https://blipn.github.io/1dex-connector/>

Documentation publique canonique de l'API: <https://1dex.fr/developpeurs/api>

## Packages

- `packages/js`: client JavaScript/TypeScript sans dépendance runtime.
- `packages/python`: client Python fondé sur la bibliothèque standard.
- `cli`: CLI Node pour les tests rapides et les exports JSON/CSV.
- `docs/`: notes d'usage du connecteur qui renvoient vers la documentation canonique `1dex.fr`.
- `examples/`: petits exemples curl, Node, Python et Go.

## Quickstart

JavaScript:

```js
import { OneDexClient } from "@1dex/connector";

const client = new OneDexClient({
  baseUrl: "https://1dex.fr",
});

const overview = await client.overview.address({
  address: "10 rue des cordeliers aix",
  dvf_radius_m: 300,
});
console.log(overview.cards);
```

Python:

```python
from onedex import OneDexClient

client = OneDexClient(
    base_url="https://1dex.fr",
)

overview = client.overview.address({
    "address": "10 rue des cordeliers aix",
    "dvf_radius_m": 300,
})
print(overview["cards"])
```

CLI:

```bash
npm i -g @1dex-fr/1dex
1dex "10 rue de la Paix, Paris"
```

## Liens publics canoniques de l'API

- Racine API: <https://1dex.fr/api/v1>
- Racine API bêta: <https://beta.1dex.fr/api/v1>
- Documentation machine: <https://1dex.fr/api/v1/openapi.yaml>
- Documentation technique: <https://1dex.fr/developpeurs/api/technique>
- Outil d’habilitation d’accès: <https://1dex.fr/contact>
- Documentation métier: <https://1dex.fr/developpeurs/api/metier>
- Limites d’appels: <https://1dex.fr/developpeurs/api/quotas>

Le site GitHub Pages pointe volontairement vers ces documents runtime au lieu de dupliquer les points d'entrée, les quotas ou la documentation métier.

## Development

```bash
npm run ci
```

The JS package uses native `fetch` and Node's built-in test runner. The Python package uses `urllib.request` and `unittest`.
