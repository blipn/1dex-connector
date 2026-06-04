# Erreurs

Le contrat public canonique des erreurs est documenté sur `1dex.fr`:

<https://1dex.fr/developpeurs/api#reference>

Comportement du connecteur:

- Les réponses HTTP `2xx` sont renvoyées en JSON décodé.
- Les réponses non `2xx` lèvent `OneDexApiError`.
- L'objet d'erreur contient `status`, `body` décodé lorsqu'il est disponible, et le meilleur identifiant de requête disponible.
- Les appelants doivent respecter `Retry-After` sur les réponses `429`.
