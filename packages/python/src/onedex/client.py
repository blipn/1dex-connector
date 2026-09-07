from __future__ import annotations

import json
import math
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Mapping
from email.utils import parsedate_to_datetime
from datetime import timezone


DEFAULT_BASE_URL = "https://1dex.fr"
RETRYABLE_STATUSES = frozenset((202, 429, 503))
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
        retryable: bool = False,
        retry_after_seconds: int | None = None,
        code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.body = body
        self.request_id = request_id
        self.headers = dict(headers or {})
        self.retryable = retryable
        self.retry_after_seconds = retry_after_seconds
        self.code = code


def _normalize_base_url(base_url: str | None) -> str:
    value = (base_url or DEFAULT_BASE_URL).strip()
    if not value:
        raise ValueError("base_url must not be empty.")
    return value.rstrip("/").removesuffix("/api/v1")


class _NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward API credentials or replay a mutation to another URL.
        return None


def _ensure_mapping(value: Any, name: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise TypeError(f"{name} must be a mapping.")
    return value


def _ensure_non_empty_string(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{name} must be a non-empty string.")
    return value.strip()


def _normalize_idempotency_key(value: Any, name: str = "idempotency_key") -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{name} must be a non-empty string.")
    if value != value.strip() or any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError(f"{name} must not contain surrounding whitespace or control characters.")
    if len(value.encode("utf-8")) > 255:
        raise ValueError(f"{name} must be at most 255 UTF-8 bytes.")
    return value


def _merge_payload(
    payload: Mapping[str, Any] | None,
    keyword_payload: Mapping[str, Any],
    name: str,
) -> dict[str, Any]:
    data = dict(_ensure_mapping(payload, name)) if payload is not None else {}
    for key, value in keyword_payload.items():
        if key in data and data[key] != value:
            raise ValueError(f"{name} received conflicting values for {key}.")
        data[key] = value
    return data


def _split_idempotent_payload(
    payload: Mapping[str, Any],
    explicit_key: str | None,
    name: str,
) -> tuple[dict[str, Any], str]:
    data = dict(payload)
    camel_key = data.pop("idempotencyKey", None)
    snake_key = data.pop("idempotency_key", None)
    candidates = [value for value in (camel_key, snake_key, explicit_key) if value is not None]
    if not candidates:
        raise ValueError(f"{name} requires idempotency_key.")
    normalized = [_normalize_idempotency_key(value, f"{name} idempotency_key") for value in candidates]
    if any(value != normalized[0] for value in normalized[1:]):
        raise ValueError(f"{name} received conflicting idempotency keys.")
    return data, normalized[0]


def _normalize_details_path(base_url: str, details_url: str) -> str:
    value = _ensure_non_empty_string(details_url, "details_url")
    base = urllib.parse.urlsplit(base_url)
    resolved = urllib.parse.urlsplit(urllib.parse.urljoin(f"{base_url}/", value))
    if (resolved.scheme, resolved.netloc) != (base.scheme, base.netloc) or resolved.path != "/api/v1/address-details":
        raise ValueError("details_url must target /api/v1/address-details on the configured 1dex origin.")
    return urllib.parse.urlunsplit(("", "", resolved.path, resolved.query, ""))


def _has_coordinates(payload: Mapping[str, Any]) -> bool:
    return payload.get("lon") is not None and payload.get("lat") is not None


def _has_address_locator(payload: Mapping[str, Any]) -> bool:
    return (
        (isinstance(payload.get("address"), str) and payload["address"].strip())
        or (isinstance(payload.get("normalized_address_key"), str) and payload["normalized_address_key"].strip())
        or (isinstance(payload.get("parcel_record_key"), str) and payload["parcel_record_key"].strip())
        or _has_coordinates(payload)
    )


def _has_normalized_address_key(payload: Mapping[str, Any]) -> bool:
    return isinstance(payload.get("normalized_address_key"), str) and payload["normalized_address_key"].strip()


def _has_resolved_address_locator(payload: Mapping[str, Any]) -> bool:
    return (
        (isinstance(payload.get("address"), str) and payload["address"].strip())
        or (isinstance(payload.get("parcel_record_key"), str) and payload["parcel_record_key"].strip())
        or _has_coordinates(payload)
    )


def _ensure_normalized_address_key_is_alone(payload: Mapping[str, Any], name: str) -> None:
    if _has_normalized_address_key(payload) and (_has_resolved_address_locator(payload) or payload.get("city_code")):
        raise ValueError(
            f"{name} must use normalized_address_key alone, without address, city_code, parcel_record_key, or lon/lat."
        )


def _normalize_address_locator_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    data = dict(payload)
    city_code = data.pop("cityCode", data.get("city_code"))
    parcel_record_key = data.pop("parcelRecordKey", data.get("parcel_record_key"))
    normalized_address_key = data.pop("normalizedAddressKey", data.get("normalized_address_key"))
    data["city_code"] = city_code
    data["parcel_record_key"] = parcel_record_key
    data["normalized_address_key"] = normalized_address_key
    return data


def _csv_list(value: Any, name: str) -> str:
    if isinstance(value, (list, tuple)):
        items = [str(item).strip() for item in value if str(item).strip()]
        if not items:
            raise ValueError(f"{name} must not be empty.")
        return ",".join(items)
    return _ensure_non_empty_string(value, name)


def _read_json_response(response: Any) -> Any:
    raw = response.read()
    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        status = int(getattr(response, "status", getattr(response, "code", 200)))
        if status >= 400 or status == 202 or 300 <= status < 400:
            return raw.decode("utf-8", errors="replace")
        raise OneDexApiError("1dex API returned invalid JSON.", status=status) from exc


def _request_id_from_body(body: Any) -> str | None:
    if isinstance(body, Mapping) and isinstance(body.get("request_id"), str):
        return body["request_id"]
    return None


def _headers_to_dict(headers: Any) -> dict[str, str]:
    if headers is None:
        return {}
    if hasattr(headers, "items"):
        return {str(key): str(value) for key, value in headers.items()}
    return dict(headers)


def _header_value(headers: Mapping[str, str], name: str) -> str | None:
    normalized_name = name.lower()
    for key, value in headers.items():
        if key.lower() == normalized_name:
            return value
    return None


def _parse_retry_after_seconds(body: Any, headers: Mapping[str, str]) -> int | None:
    raw_header = _header_value(headers, "retry-after")
    if raw_header is not None:
        try:
            value = float(raw_header)
            if math.isfinite(value) and value >= 0:
                return math.ceil(value)
        except (TypeError, ValueError):
            pass
        try:
            deadline = parsedate_to_datetime(raw_header)
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            return max(0, math.ceil(deadline.timestamp() - time.time()))
        except (TypeError, ValueError, OverflowError):
            pass
    if isinstance(body, Mapping):
        try:
            value = float(body.get("retry_after_seconds"))
            if math.isfinite(value) and value >= 0:
                return math.ceil(value)
        except (TypeError, ValueError):
            pass
    return None


def _build_api_error(status: int, body: Any, headers: Mapping[str, str]) -> OneDexApiError:
    warning = (
        body.get("warnings", [None])[0]
        if isinstance(body, Mapping) and isinstance(body.get("warnings"), list) and body.get("warnings")
        else None
    )
    message = (
        warning.get("message")
        if isinstance(warning, Mapping) and isinstance(warning.get("message"), str)
        else body.get("message")
        if isinstance(body, Mapping) and isinstance(body.get("message"), str)
        else "1dex API request is still in progress."
        if status == 202
        else f"1dex API request failed with HTTP {status}."
    )
    code = None
    if isinstance(body, Mapping):
        raw_code = body.get("error", body.get("status"))
        code = raw_code if isinstance(raw_code, str) else None
    return OneDexApiError(
        message,
        status=status,
        body=body,
        request_id=_request_id_from_body(body) or _header_value(headers, "x-request-id"),
        headers=headers,
        retryable=status in RETRYABLE_STATUSES,
        retry_after_seconds=_parse_retry_after_seconds(body, headers),
        code=code,
    )


def _network_error_message(exc: BaseException) -> str:
    reason = getattr(exc, "reason", None)
    return str(reason or exc)


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


class _AddressNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def details(
        self,
        payload: Mapping[str, Any] | None = None,
        *,
        idempotency_key: str | None = None,
        max_attempts: int = 1,
        max_retry_delay: float | None = None,
        cancel_event: Any = None,
        **locator: Any,
    ) -> Any:
        merged = _merge_payload(payload, locator, "address details input")
        intent, key = _split_idempotent_payload(merged, idempotency_key, "address details input")
        data = _normalize_address_locator_payload(intent)
        fields = _csv_list(data.pop("fields", None), "address details fields")
        _ensure_normalized_address_key_is_alone(data, "address details input")
        if not _has_address_locator(data):
            raise ValueError("address details input requires address, normalized_address_key, parcel_record_key, or lon/lat.")
        data["fields"] = fields
        return self._client.request(
            "GET",
            "/api/v1/address-details",
            query=data,
            idempotency_key=key,
            max_attempts=max_attempts,
            max_retry_delay=max_retry_delay,
            cancel_event=cancel_event,
        )

    def details_url(
        self,
        details_url: str,
        *,
        idempotency_key: str,
        max_attempts: int = 1,
        max_retry_delay: float | None = None,
        cancel_event: Any = None,
    ) -> Any:
        return self._client.request(
            "GET",
            _normalize_details_path(self._client.base_url, details_url),
            idempotency_key=_normalize_idempotency_key(idempotency_key),
            max_attempts=max_attempts,
            max_retry_delay=max_retry_delay,
            cancel_event=cancel_event,
        )

    def detailsUrl(self, details_url: str, **options: Any) -> Any:  # noqa: N802
        return self.details_url(details_url, **options)

    def unlock(
        self,
        payload: Mapping[str, Any] | None = None,
        *,
        idempotency_key: str | None = None,
        max_attempts: int = 1,
        max_retry_delay: float | None = None,
        cancel_event: Any = None,
        **locator: Any,
    ) -> Any:
        merged = _merge_payload(payload, locator, "address unlock input")
        intent, key = _split_idempotent_payload(merged, idempotency_key, "address unlock input")
        data = _normalize_address_locator_payload(intent)
        _ensure_normalized_address_key_is_alone(data, "address unlock input")
        if not _has_address_locator(data):
            raise ValueError("address unlock input requires address, normalized_address_key, parcel_record_key, or lon/lat.")
        return self._client.request(
            "POST",
            "/api/v1/address-unlocks",
            body=data,
            idempotency_key=key,
            max_attempts=max_attempts,
            max_retry_delay=max_retry_delay,
            cancel_event=cancel_event,
        )


class _AccountNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def usage(self) -> Any:
        return self._client.request("GET", "/api/v1/account/usage")


class _CommunesNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def search(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "commune search input"))
        data["q"] = _ensure_non_empty_string(data.get("q"), "commune search q")
        return self._client.request("GET", "/api/v1/communes/search", query=data)


class _PreviewNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def by_path(self, path_or_payload: str | Mapping[str, Any]) -> Any:
        if isinstance(path_or_payload, str):
            path = path_or_payload
        else:
            path = _ensure_mapping(path_or_payload, "public preview input").get("path")
        return self._client.request(
            "GET",
            "/api/v1/public-preview",
            query={"path": _ensure_non_empty_string(path, "public preview path")},
        )

    def byPath(self, path_or_payload: str | Mapping[str, Any]) -> Any:  # noqa: N802
        return self.by_path(path_or_payload)


class _MapNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client
        self.focus = _MapFocusNamespace(client)

    def _layer(self, payload: Mapping[str, Any], default_layer: str = "parcelles") -> Any:
        data = dict(_ensure_mapping(payload, "map layer input"))
        address = data.pop("address", None)
        city_code = data.pop("city_code", data.pop("cityCode", None))
        lon = data.get("lon")
        lat = data.get("lat")
        layer = data.pop("layer", data.pop("layerKey", data.pop("layer_key", default_layer)))
        layer_key = _normalize_map_layer(layer)
        if isinstance(address, str) and address.strip():
            query = {"address": address.strip(), "city_code": city_code, **data}
            return self._client.request("GET", f"/api/v1/map-layer/{urllib.parse.quote(layer_key)}", query=query)

        if (lon is not None and lat is not None) or (isinstance(city_code, str) and city_code.strip()):
            query = {"city_code": city_code.strip() if isinstance(city_code, str) and city_code.strip() else None, **data}
            return self._client.request("GET", f"/api/v1/map-layer/{urllib.parse.quote(layer_key)}", query=query)

        address_slug = data.pop("addressSlug", data.pop("address_slug", None))
        if not isinstance(address_slug, str) or not address_slug.strip():
            raise ValueError("map layer input requires address, city_code, lon/lat, or address_slug.")
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
        address = data.pop("address", None)
        city_code = data.pop("city_code", data.pop("cityCode", None))
        lon = data.get("lon")
        lat = data.get("lat")
        if (not isinstance(address, str) or not address.strip()) and (lon is None or lat is None) and (not isinstance(city_code, str) or not city_code.strip()):
            raise ValueError("map viewport input requires address, city_code, or lon/lat.")
        query = {
            "address": address.strip() if isinstance(address, str) and address.strip() else None,
            "city_code": city_code.strip() if isinstance(city_code, str) and city_code.strip() else None,
            **data,
        }
        return self._client.request(
            "GET",
            "/api/v1/map-viewport",
            query=query,
        )


class _MapFocusNamespace:
    def __init__(self, client: "OneDexClient") -> None:
        self._client = client

    def parcelle(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "map focus parcelle input"))
        record_key = data.get("record_key", data.get("recordKey"))
        return self._client.request(
            "GET",
            "/api/v1/map-focus/parcelle",
            query={"record_key": _ensure_non_empty_string(record_key, "map focus parcelle record_key")},
        )

    def parcelles(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "map focus parcelles input"))
        record_keys = data.get("record_keys", data.get("recordKeys"))
        return self._client.request(
            "GET",
            "/api/v1/map-focus/parcelles",
            query={"record_keys": _csv_list(record_keys, "map focus parcelles record_keys")},
        )

    def address(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "map focus address input"))
        address = data.pop("address", None)
        city_code = data.pop("city_code", data.pop("cityCode", None))
        return self._client.request(
            "GET",
            "/api/v1/map-focus/address",
            query={
                "address": _ensure_non_empty_string(address, "map focus address"),
                "city_code": city_code,
                **data,
            },
        )

    def public_location(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "map focus public location input"))
        if data.get("lon") is None or data.get("lat") is None:
            raise ValueError("map focus public location input requires lon and lat.")
        return self._client.request("GET", "/api/v1/map-focus/public-location", query=data)

    def publicLocation(self, payload: Mapping[str, Any]) -> Any:  # noqa: N802
        return self.public_location(payload)

    def feature(self, payload: Mapping[str, Any]) -> Any:
        data = dict(_ensure_mapping(payload, "map focus feature input"))
        layer_key = data.get("layer_key", data.get("layerKey", data.get("layer")))
        feature_key = data.get("feature_key", data.get("featureKey"))
        return self._client.request(
            "GET",
            "/api/v1/map-focus/feature",
            query={
                "layer_key": _ensure_non_empty_string(layer_key, "map focus feature layer_key"),
                "feature_key": _ensure_non_empty_string(feature_key, "map focus feature feature_key"),
            },
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
        api_key: str | None = None,
        headers: Mapping[str, str] | None = None,
        timeout: float = 30.0,
        opener: Any = None,
        sleeper: Any = None,
    ) -> None:
        self.base_url = _normalize_base_url(base_url)
        self.headers = {}
        if api_key and api_key.strip():
            self.headers["Authorization"] = f"Bearer {api_key.strip()}"
        self.headers.update(dict(headers or {}))
        self.timeout = timeout
        self._opener = opener or urllib.request.build_opener(_NoRedirects()).open
        self._sleeper = sleeper or time.sleep
        self.autocomplete = _AutocompleteNamespace(self)
        self.address_pages = _AddressPagesNamespace(self)
        self.addressPages = self.address_pages  # noqa: N815
        self.address = _AddressNamespace(self)
        self.account = _AccountNamespace(self)
        self.communes = _CommunesNamespace(self)
        self.map = _MapNamespace(self)
        self.overview = _OverviewNamespace(self)
        self.preview = _PreviewNamespace(self)
        self.score = _ScoreNamespace(self)

    def request(
        self,
        method: str,
        path: str,
        *,
        body: Mapping[str, Any] | None = None,
        query: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        idempotency_key: str | None = None,
        max_attempts: int = 1,
        max_retry_delay: float | None = None,
        cancel_event: Any = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        if query:
            filtered = {
                key: value
                for key, value in query.items()
                if value is not None and value != ""
            }
            url = f"{url}?{urllib.parse.urlencode(filtered)}"

        request_headers = {"accept": "application/json"}
        for source in (self.headers, dict(headers or {})):
            request_headers.update({key.lower(): str(value) for key, value in source.items()})
        if idempotency_key is not None:
            request_headers["idempotency-key"] = _normalize_idempotency_key(idempotency_key)
        data = None
        if body is not None:
            request_headers.setdefault("content-type", "application/json")
            filtered_body = {
                key: value
                for key, value in body.items()
                if value is not None and value != ""
            }
            data = json.dumps(filtered_body).encode("utf-8")

        if not isinstance(max_attempts, int) or max_attempts < 1 or max_attempts > 10:
            raise ValueError("max_attempts must be an integer between 1 and 10.")
        if max_retry_delay is not None and (not math.isfinite(max_retry_delay) or max_retry_delay < 0):
            raise ValueError("max_retry_delay must be finite and non-negative.")

        for attempt in range(1, max_attempts + 1):
            if cancel_event is not None and cancel_event.is_set():
                raise OneDexApiError("1dex API request aborted.", status=0)
            request = urllib.request.Request(
                url,
                data=data,
                headers=request_headers,
                method=method.upper(),
            )
            error: OneDexApiError | None = None
            try:
                with self._opener(request, timeout=self.timeout) as response:
                    status = int(getattr(response, "status", getattr(response, "code", 200)))
                    response_headers = _headers_to_dict(getattr(response, "headers", {}))
                    body_value = _read_json_response(response)
                    if status == 202 or status >= 300:
                        error = _build_api_error(status, body_value, response_headers)
                    else:
                        return body_value
            except urllib.error.HTTPError as exc:
                with exc:
                    body_value = _read_json_response(exc)
                    error = _build_api_error(exc.code, body_value, _headers_to_dict(exc.headers))
            except (urllib.error.URLError, OSError) as exc:
                raise OneDexApiError(
                    f"Unable to reach 1dex API: {_network_error_message(exc)}",
                    status=0,
                ) from exc

            if error is None:
                raise OneDexApiError("1dex API retry loop ended unexpectedly.", status=0)
            if not error.retryable or attempt >= max_attempts:
                raise error
            delay = float(error.retry_after_seconds if error.retry_after_seconds is not None else 1)
            if delay > min(max_retry_delay if max_retry_delay is not None else 2_147_483, 2_147_483):
                raise error
            if cancel_event is not None:
                if cancel_event.wait(delay):
                    raise OneDexApiError("1dex API request aborted.", status=0)
            elif delay > 0:
                self._sleeper(delay)

        raise OneDexApiError("1dex API retry loop ended unexpectedly.", status=0)

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
