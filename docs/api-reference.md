# Référence API

La référence canonique de l'API est servie par le runtime 1dex Explorer:

- Racine API: <https://1dex.fr/api/v1>
- OpenAPI: <https://1dex.fr/api/v1/openapi.yaml>
- Référence Swagger: <https://1dex.fr/api/v1/docs>
- Documentation développeurs: <https://1dex.fr/developpeurs/api>

Ce dépôt connecteur ne duplique pas les contrats des points d'entrée. Garder les exemples de code ici, et mettre à jour le contrat API sur `1dex.fr`. La route `address-pages/{slug}/state` reste supportée par le runtime et les helpers du connecteur, mais elle n’est pas exposée dans l’OpenAPI canonique tant que ce détail de page publique n’est pas promu en contrat documenté.
