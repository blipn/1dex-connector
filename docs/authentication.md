# Authentification

Les liens canoniques d'accès et d'habilitation sont maintenus sur `1dex.fr`:

- Accès aux clés API: <https://1dex.fr/compte/api>
- Racine API: <https://1dex.fr/api/v1>
- Référence Swagger: <https://1dex.fr/api/v1/docs>
- Documentation développeurs: <https://1dex.fr/developpeurs/api>

Les clients JS, Python et CLI ajoutent `Authorization: Bearer <api-key>` lorsque `apiKey`, `api_key`, `--api-key` ou `ONEDEX_API_KEY` est fourni. Les lectures publiques restent possibles sans clé dans les quotas publics; les routes subscriber comme `address-details`, `address-unlocks` et `account/usage` nécessitent une clé valide et les droits d'accès associés.

## Comptes professionnels abonnes

Pendant la phase de lancement, les endpoints subscriber sont reserves aux comptes professionnels avec abonnement actif. Le runtime accepte aussi l'en-tete `X-1dex-api-key`, mais les connecteurs envoient par defaut `Authorization: Bearer <cle>`.

Erreurs d'acces a prevoir:

- `401 invalid_api_key`: cle absente, inconnue ou revoquee.
- `403 api_subscription_required`: compte sans abonnement actif.
- `403 api_professional_required`: compte abonne mais non professionnel.
- `402 address_unlock_required`: l'adresse doit d'abord etre debloquee avant lecture complete.
- `402 insufficient_credits`: aucun credit adresse disponible pour le deblocage demande.

`GET /api/v1/account/usage` est le point de controle a appeler avant un lot pro: il renvoie les fenetres de quota API, les credits adresse restants, les grants actifs, les consommations recentes et l'etat d'abonnement.
