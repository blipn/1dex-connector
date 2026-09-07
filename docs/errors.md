# Erreurs

Le contrat public canonique des erreurs est documente sur `1dex.fr`:

<https://1dex.fr/developpeurs/api#reference>

Comportement du connecteur:

- Les réponses HTTP finales `2xx`, sauf `202`, sont renvoyées en JSON décodé.
- `202 request_in_progress` est exposé comme temporaire ou rejoué quand la politique de tentatives est activée.
- Les autres réponses non finales lèvent `OneDexApiError`.
- L'objet d'erreur contient `status`, `body`, `requestId`, `retryable`, `retryAfterSeconds` et `code` lorsqu'ils sont disponibles.
- `202`, `429` et `503` sont rejouables avec la même `Idempotency-Key`; les clients respectent `Retry-After` et bornent le nombre de tentatives.
- `409` n'est jamais rejoué: la clé d'idempotence identifie déjà une autre intention.
- Une annulation JS coupe la requête et l'attente. En Python synchrone, `cancel_event` arrête avant l'appel ou entre deux tentatives.

Erreurs d'acces pro usuelles:

- `401 invalid_api_key`: cle absente, inconnue ou revoquee.
- `403 api_subscription_required`: compte sans abonnement actif.
- `403 api_professional_required`: compte abonne mais non professionnel.
- `402 address_unlock_required`: l'adresse doit d'abord etre debloquee avant lecture complete.
- `402 insufficient_credits`: aucun credit adresse disponible pour le deblocage demande.
