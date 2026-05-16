# Errors

The public route documented today returns the raw JSON published by `1dex.fr`.

Connector behavior:

- HTTP `2xx` responses are returned as decoded JSON.
- Non-`2xx` responses raise `OneDexApiError`.
- The error object includes `status`, decoded `body` when available, headers, and the best available request id.

Known successful payloads include a `warnings` array. The connectors keep that array as-is instead of mapping warning codes that are not part of the public contract.
