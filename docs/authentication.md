# Authentication

Public API calls can be anonymous for free demo usage when the public gateway allows it. Account-backed usage uses bearer authentication:

```http
Authorization: Bearer <api-key>
```

The JS and Python clients add this header when `apiKey` / `api_key` is provided. Connector methods support both authenticated and unauthenticated calls so the same code can be used for free exploration and account-backed quotas.
