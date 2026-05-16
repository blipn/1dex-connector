# Rate Limits

No public rate-limit contract is documented for the verified `1dex.fr` parcel endpoint.

Connectors do not retry automatically. If `1dex.fr` returns `429`, callers should inspect the response headers and apply their own backoff policy.
