# Erreurs

Le contrat public canonique des erreurs est documente sur `1dex.fr`:

<https://1dex.fr/developpeurs/api#reference>

Comportement du connecteur:

- Les reponses HTTP `2xx` sont renvoyees en JSON decode.
- Les reponses non `2xx` levent `OneDexApiError`.
- L'objet d'erreur contient `status`, `body` decode lorsqu'il est disponible, et le meilleur identifiant de requete disponible.
- Les appelants doivent respecter `Retry-After` sur les reponses `429`.

Erreurs d'acces pro usuelles:

- `401 invalid_api_key`: cle absente, inconnue ou revoquee.
- `403 api_subscription_required`: compte sans abonnement actif.
- `403 api_professional_required`: compte abonne mais non professionnel.
- `402 address_unlock_required`: l'adresse doit d'abord etre debloquee avant lecture complete.
- `402 insufficient_credits`: aucun credit adresse disponible pour le deblocage demande.
