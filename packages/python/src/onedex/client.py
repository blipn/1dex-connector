from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Mapping


DEFAULT_BASE_URL = "https://1dex.fr"
PUBLIC_MAP_LAYERS = frozenset((
    "context",
    "iris",
    "parcelles",
    "parcelles_dvf",
    "parcelles_travaux",
    "parcelles_labels",
))
PUBLIC_MAP_LAYER_ALIASES = {
    "dvf": "parcelles_dvf",
    "travaux": "parcelles_travaux",
    "labels": "parcelles_labels",
}


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


def _normalize_map_layer(layer: Any) -> str:
    normalized = str(layer or "").strip()
    layer_key = PUBLIC_MAP_LAYER_ALIASES.get(normalized, normalized)
    if layer_key not in PUBLIC_MAP_LAYERS:
        raise ValueError(f"Unsupported public map layer: {normalized or '(empty)'}.")
    return layer_key


class _AutocompleteNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def address(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "autocomplete input"))
        query = data.get("q")
        if not isinstance(query, str) or not query.strip():
            raise ValueError("autocomplete input requires q.")
        data["q"] = query.strip()
        return self._client.request("GET", "/api/v1/autocomplete/address", query=data)


class _AddressPagesNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def state(self, slug: str) -> Any:
        if not isinstance(slug, str) or not slug.strip():
            raise ValueError("address page state requires slug.")
        return self._client.request("GET", f"/api/v1/address-pages/{urllib.parse.quote(slug.strip())}/state")


class _MapNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def _layer(self, payload: Mapping[str, Any], default_layer: str = "parcelles") -> Any:
        data = dict(_ensure_mapping(payload, "map layer input"))
        address = data.pop("address", None)
        lon = data.get("lon")
        lat = data.get("lat")
        layer = data.pop("layer", data.pop("layerKey", data.pop("layer_key", default_layer)))
        layer_key = _normalize_map_layer(layer)
        if isinstance(address, str) and address.strip():
            query = {"address": address.strip(), **data}
            return self._client.request("GET", f"/api/v1/map-layer/{urllib.parse.quote(layer_key)}", query=query)

        if lon is not None and lat is not None:
            return self._client.request("GET", f"/api/v1/map-layer/{urllib.parse.quote(layer_key)}", query=data)

        address_slug = data.pop("addressSlug", data.pop("address_slug", None))
        if not isinstance(address_slug, str) or not address_slug.strip():
            raise ValueError("map layer input requires address, lon/lat, or address_slug.")
        path = f"/adresse/{urllib.parse.quote(address_slug.strip())}/explore/map-layer/{urllib.parse.quote(layer_key)}"
        return self._client.request("GET", path, query=data)

    def parcelles(self, payload: Mapping[str, Any]) -> Any:
        return self._layer(payload, "parcelles")

    def dvf(self, payload: Mapping[str, Any]) -> Any:
        return self._layer({**dict(payload), "layer": "parcelles_dvf"})

    def travaux(self, payload: Mapping[str, Any]) -> Any:
        return self._layer({**dict(payload), "layer": "parcelles_travaux"})

    def iris(self, payload: Mapping[str, Any]) -> Any:
        return self._layer({**dict(payload), "layer": "iris"})

    def context(self, payload: Mapping[str, Any]) -> Any:
        return self._layer({**dict(payload), "layer": "context"})

    def labels(self, payload: Mapping[str, Any]) -> Any:
        return self._layer({**dict(payload), "layer": "parcelles_labels"})

    def layer(self, payload: Mapping[str, Any]) -> Any:
        return self._layer(payload)

    def viewport(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "map viewport input"))
        layers = data.get("layers")
        if not isinstance(layers, str) or not layers.strip():
            raise ValueError("map viewport input requires layers.")
        address = data.get("address")
        lon = data.get("lon")
        lat = data.get("lat")
        if (not isinstance(address, str) or not address.strip()) and (lon is None or lat is None):
            raise ValueError("map viewport input requires address or lon/lat.")
        return self._client.request(
            "GET",
            "/api/v1/map-viewport",
            query=data,
        )


class _OverviewNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def address(self, payload: Mapping[str, Any]) -> Any:
        return self._client.address_overview(payload)


class _ScoreNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def address(self, payload: Mapping[str, Any]) -> Any:
        return self._client.score_address(payload)

    def compare(self, payload: Mapping[str, Any]) -> Any:
        return self._client.score_compare(payload)

    def grid(self, payload: Mapping[str, Any]) -> Any:
        return self._client.score_grid(payload)

    def address_suggest(self, payload: Mapping[str, Any]) -> Any:
        return self._client.score_address_suggest(payload)

    def addressSuggest(self, payload: Mapping[str, Any]) -> Any:  # noqa: N802
        return self.address_suggest(payload)


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
        self.autocomplete = _AutocompleteNamespace(self)
        self.address_pages = _AddressPagesNamespace(self)
        self.addressPages = self.address_pages  # noqa: N815
        self.map = _MapNamespace(self)
        self.overview = _OverviewNamespace(self)
        self.score = _ScoreNamespace(self)

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

    def address_overview(self, payload: Mapping[str, Any]) -> Any:
        return self.request(
            "GET",
            "/api/v1/address-overview",
            query=dict(_ensure_mapping(payload, "address overview input")),
        )

    def score_address(self, payload: Mapping[str, Any]) -> Any:
        return self.request(
            "POST",
            "/api/v1/score/address",
            body=dict(_ensure_mapping(payload, "score address input")),
        )

    def score_compare(self, payload: Mapping[str, Any]) -> Any:
        return self.request(
            "POST",
            "/api/v1/score/compare",
            body=dict(_ensure_mapping(payload, "score compare input")),
        )

    def score_grid(self, payload: Mapping[str, Any]) -> Any:
        return self.request(
            "GET",
            "/api/v1/score/grid",
            query=dict(_ensure_mapping(payload, "score grid input")),
        )

    def score_address_suggest(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "score address suggest input"))
        query = data.get("q")
        if not isinstance(query, str) or not query.strip():
            raise ValueError("score address suggest input requires q.")
        data["q"] = query.strip()
        return self.request("GET", "/api/v1/score/address-suggest", query=data)
