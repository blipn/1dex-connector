# Rate Limits

The public gateway should expose standard rate-limit headers:

```http
RateLimit-Limit: 120
RateLimit-Remaining: 118
RateLimit-Reset: 60
Retry-After: 30
```

Connectors do not retry automatically in the MVP. Callers should inspect `Retry-After` on `429` responses and apply their own backoff policy.
