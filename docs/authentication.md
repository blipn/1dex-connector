# Authentification

Les liens canoniques d'accès et d'habilitation sont maintenus sur `1dex.fr`:

- Accès aux clés API: <https://1dex.fr/compte/api>
- Racine API: <https://1dex.fr/api/v1>
- Référence Swagger: <https://1dex.fr/api/v1/docs>
- Documentation développeurs: <https://1dex.fr/developpeurs/api>

Les clients JS, Python et CLI ajoutent `Authorization: Bearer <api-key>` lorsque `apiKey`, `api_key`, `--api-key` ou `ONEDEX_API_KEY` est fourni. Les lectures publiques restent possibles sans clé dans les quotas publics; `address-details`, `address-unlocks` et `account/usage` nécessitent une clé valide et les droits associés.

## Comptes professionnels abonnes

Une clé Free de démonstration est limitée à l'adresse épinglée par 1dex. Une clé live suit les droits et activations du compte. Cette décision appartient au runtime: les connecteurs ne déduisent jamais le mode depuis le préfixe de la clé. Le runtime accepte aussi `X-1dex-api-key`, mais les connecteurs envoient par défaut `Authorization: Bearer <clé>`.

Les lectures détaillées et déblocages ajoutent aussi une `Idempotency-Key` générée par l'appelant. Elle n'est ni une clé API ni un secret: elle doit rester stable pour les tentatives d'une même intention et changer pour toute nouvelle intention.

Erreurs d'acces a prevoir:

- `401 invalid_api_key`: cle absente, inconnue ou revoquee.
- `403 api_subscription_required`: compte sans abonnement actif.
- `403 api_professional_required`: compte abonne mais non professionnel.
- `402 address_unlock_required`: l'adresse doit d'abord etre debloquee avant lecture complete.
- `402 insufficient_credits`: aucun credit adresse disponible pour le deblocage demande.

`GET /api/v1/account/usage` est le point de contrôle avant un lot: sa réponse V2 décrit `api_addresses` en mode live ou demo. Les clients gardent la compatibilité avec la réponse V1 pendant le déploiement.
