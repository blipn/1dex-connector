# Errors

The API returns the standard 1dex response envelope for route-level errors:

```json
{
  "request_id": "uuid",
  "status": "error",
  "warnings": [
    {
      "code": "INVALID_QUERY",
      "message": "Query field is invalid.",
      "field": "address"
    }
  ]
}
```

Connector behavior:

- HTTP `2xx` responses are returned as decoded JSON.
- Non-`2xx` responses raise `OneDexApiError`.
- The error object includes `status`, decoded `body` when available, and the best available request id.

Common warning codes include `INVALID_QUERY`, `INVALID_JSON`, `ADDRESS_RESOLUTION_TIMEOUT`, `SOURCE_QUERY_TIMEOUT`, `SOURCE_UNKNOWN`, `SOURCE_NOT_IMPLEMENTED`, and `ADDRESS_RESOLUTION_NOT_IMPLEMENTED`.
