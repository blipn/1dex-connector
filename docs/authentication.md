# Authentification

Les liens canoniques d'accès et d'habilitation sont maintenus sur `1dex.fr`:

- Accès aux clés API: <https://1dex.fr/compte/api>
- Racine API: <https://1dex.fr/api/v1>
- Référence Swagger: <https://1dex.fr/api/v1/docs>
- Documentation développeurs: <https://1dex.fr/developpeurs/api>

Les clients JS, Python et CLI ajoutent `Authorization: Bearer <api-key>` lorsque `apiKey`, `api_key`, `--api-key` ou `ONEDEX_API_KEY` est fourni. Les lectures publiques restent possibles sans clé dans les quotas publics; les routes subscriber comme `address-details`, `address-unlocks` et `account/usage` nécessitent une clé valide et les droits d'accès associés.
