from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Mapping


DEFAULT_BASE_URL = "https://api.1dex.fr"


class OneDexApiError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status: int = 0,
        body: Any = None,
        request_id: str | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.body = body
        self.request_id = request_id
        self.headers = dict(headers or {})


def _normalize_base_url(base_url: str | None) -> str:
    value = (base_url or DEFAULT_BASE_URL).strip()
    if not value:
        raise ValueError("base_url must not be empty.")
    return value.rstrip("/")


def _ensure_mapping(value: Any, name: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise TypeError(f"{name} must be a mapping.")
    return value


def _read_json_response(response: Any) -> Any:
    raw = response.read()
    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise OneDexApiError("1dex API returned invalid JSON.") from exc


def _request_id_from_body(body: Any) -> str | None:
    if isinstance(body, Mapping) and isinstance(body.get("request_id"), str):
        return body["request_id"]
    return None


class _AddressNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def autocomplete(self, q: str | Mapping[str, Any], *, limit: int | None = None) -> Any:
        if isinstance(q, str):
            query: dict[str, Any] = {"q": q}
            if limit is not None:
                query["limit"] = limit
        else:
            query = dict(_ensure_mapping(q, "autocomplete input"))
        return self._client.request("GET", "/v1/address/autocomplete", query=query)

    def resolve(self, address_or_payload: str | Mapping[str, Any]) -> Any:
        payload = (
            {"address": address_or_payload}
            if isinstance(address_or_payload, str)
            else dict(_ensure_mapping(address_or_payload, "resolve input"))
        )
        return self._client.request("POST", "/v1/address/resolve", body=payload)

    def sources(self, address: str | None = None, **payload: Any) -> Any:
        if isinstance(address, str):
            payload = {"address": address, **payload}
        elif isinstance(address, Mapping):
            payload = {**address, **payload}
        elif address is not None:
            raise TypeError("address must be a string or mapping when provided.")
        return self._client.request("POST", "/v1/address/sources", body=payload)


class _SourceNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def query(
        self,
        source_key: str,
        payload: Mapping[str, Any] | None = None,
        **kwargs: Any,
    ) -> Any:
        if not isinstance(source_key, str) or not source_key.strip():
            raise ValueError("source_key must be a non-empty string.")
        if payload is not None:
            request_payload = {**dict(_ensure_mapping(payload, "source query payload")), **kwargs}
        else:
            request_payload = dict(kwargs)
        path = f"/v1/address/sources/{urllib.parse.quote(source_key.strip())}"
        return self._client.request("POST", path, body=request_payload)


class _DatasetsNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def list(self) -> Any:
        return self._client.request("GET", "/v1/datasets")


class OneDexClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        headers: Mapping[str, str] | None = None,
        timeout: float = 30.0,
        opener: Any = None,
    ) -> None:
        self.base_url = _normalize_base_url(base_url)
        self.api_key = api_key
        self.headers = dict(headers or {})
        self.timeout = timeout
        self._opener = opener or urllib.request.urlopen
        self.address = _AddressNamespace(self)
        self.source = _SourceNamespace(self)
        self.datasets = _DatasetsNamespace(self)

    def request(
        self,
        method: str,
        path: str,
        *,
        body: Mapping[str, Any] | None = None,
        query: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if query:
            filtered = {
                key: value
                for key, value in query.items()
                if value is not None and value != ""
            }
            url = f"{url}?{urllib.parse.urlencode(filtered)}"

        request_headers = {
            "Accept": "application/json",
            **self.headers,
            **dict(headers or {}),
        }
        if self.api_key and "Authorization" not in request_headers:
            request_headers["Authorization"] = f"Bearer {self.api_key}"

        data = None
        if body is not None:
            request_headers.setdefault("Content-Type", "application/json")
            data = json.dumps(body).encode("utf-8")

        request = urllib.request.Request(
            url,
            data=data,
            headers=request_headers,
            method=method.upper(),
        )

        try:
            with self._opener(request, timeout=self.timeout) as response:
                return _read_json_response(response)
        except urllib.error.HTTPError as exc:
            body_value = _read_json_response(exc)
            warning = (
                body_value.get("warnings", [None])[0]
                if isinstance(body_value, Mapping) and isinstance(body_value.get("warnings"), list)
                else None
            )
            message = (
                warning.get("message")
                if isinstance(warning, Mapping) and isinstance(warning.get("message"), str)
                else f"1dex API request failed with HTTP {exc.code}."
            )
            raise OneDexApiError(
                message,
                status=exc.code,
                body=body_value,
                request_id=_request_id_from_body(body_value),
                headers=dict(exc.headers.items()),
            ) from exc
