# Limites d'appels

La documentation publique canonique des quotas est maintenue sur `1dex.fr`:

<https://1dex.fr/developpeurs/api/quotas>

Les clients peuvent rejouer `202`, `429` et `503` en respectant `Retry-After`, avec un maximum explicite de tentatives. Une lecture détaillée ou un déblocage conserve alors exactement la même `Idempotency-Key`. Les valeurs de quotas ne sont pas dupliquées dans ce dépôt.

Le JavaScript active cette stratégie avec `retry: true` ou `retry: { maxAttempts, maxDelayMs }`. Le Python utilise `max_attempts` et `max_retry_delay`; la CLI expose `--max-attempts` et `--max-retry-delay-ms`.

`maxDelayMs` (JavaScript) et `max_retry_delay` (Python) limitent l’attente acceptée : si le serveur demande davantage, le client rend l’erreur avec son délai de reprise. Aucun rejeu anticipé n’est envoyé. La CLI reprend ce comportement avec `--max-retry-delay-ms`.
