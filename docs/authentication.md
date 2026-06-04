# Authentification

Les liens canoniques d'accès et d'habilitation sont maintenus sur `1dex.fr`:

- Outil d’habilitation d’accès: <https://1dex.fr/contact>
- Racine API: <https://1dex.fr/api/v1>
- Référence Swagger: <https://1dex.fr/api/v1/docs>
- Documentation développeurs: <https://1dex.fr/developpeurs/api>

Les clients JS et Python ajoutent `Authorization: Bearer <api-key>` lorsque `apiKey` / `api_key` est fourni. Les méthodes du connecteur prennent en charge les lectures publiques non authentifiées et les usages rattachés à un compte lorsque l'accès est accordé.
