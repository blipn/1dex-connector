from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Mapping


DEFAULT_BASE_URL = "https://1dex.fr"


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


class _MapNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def parcelles(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "parcelles input"))
        address_slug = data.pop("addressSlug", data.pop("address_slug", None))
        if not isinstance(address_slug, str) or not address_slug.strip():
            raise ValueError("parcelles input requires address_slug.")
        path = f"/adresse/{urllib.parse.quote(address_slug.strip())}/explore/map-layer/parcelles"
        return self._client.request("GET", path, query=data)


class OneDexClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        headers: Mapping[str, str] | None = None,
        timeout: float = 30.0,
        opener: Any = None,
    ) -> None:
        self.base_url = _normalize_base_url(base_url)
        self.headers = dict(headers or {})
        self.timeout = timeout
        self._opener = opener or urllib.request.urlopen
        self.map = _MapNamespace(self)

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
