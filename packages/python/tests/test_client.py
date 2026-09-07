import json
import sys
import threading
import unittest
import urllib.error
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from onedex import OneDexApiError, OneDexClient  # noqa: E402


class FakeResponse:
    def __init__(self, body, *, status=200, headers=None):
        self._body = json.dumps(body).encode("utf-8")
        self.status = status
        self.headers = headers or {}
        self.closed = False

    def read(self):
        return self._body

    def close(self):
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class ClientTest(unittest.TestCase):
    def test_default_base_url_uses_public_1dex_host(self):
        client = OneDexClient()
        self.assertEqual(client.base_url, "https://1dex.fr")

    def test_map_parcelles_uses_canonical_public_path(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"status": "success"})

        client = OneDexClient(base_url="http://example.test", opener=opener)
        client.map.parcelles({
            "address": "50 rue des tanneurs aix",
            "viewport_render_mode": "features",
        })

        request, timeout = calls[0]
        self.assertEqual(
            request.full_url,
            "http://example.test/api/v1/map-layer/parcelles?address=50+rue+des+tanneurs+aix&viewport_render_mode=features",
        )
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(timeout, 30.0)

    def test_map_helpers_cover_public_layers_and_viewport(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"status": "success"})

        client = OneDexClient(base_url="http://example.test", opener=opener)
        client.map.dvf({
            "address": "50 rue des tanneurs aix",
            "viewport_render_mode": "features",
        })
        client.map.travaux({
            "address": "50 rue des tanneurs aix",
            "viewport_render_mode": "features",
        })
        client.map.labels({
            "address": "50 rue des tanneurs aix",
        })
        client.map.layer({
            "layer": "iris",
            "address": "50 rue des tanneurs aix",
        })
        client.map.viewport({
            "layers": "context,iris",
            "address": "10 rue des cordeliers aix",
        })
        client.map.layer({
            "layer": "parcelles",
            "lon": -0.542902,
            "lat": 47.468617,
            "viewport_render_mode": "features",
        })
        client.map.viewport({
            "layers": "context,iris",
            "lon": -0.542902,
            "lat": 47.468617,
        })
        client.map.layer({"layer": "context", "city_code": "13001"})
        client.map.viewport({"layers": "context,iris", "city_code": "13001"})

        self.assertEqual(
            calls[0][0].full_url,
            "http://example.test/api/v1/map-layer/parcelles_dvf?address=50+rue+des+tanneurs+aix&viewport_render_mode=features",
        )
        self.assertEqual(
            calls[1][0].full_url,
            "http://example.test/api/v1/map-layer/parcelles_travaux?address=50+rue+des+tanneurs+aix&viewport_render_mode=features",
        )
        self.assertEqual(
            calls[2][0].full_url,
            "http://example.test/api/v1/map-layer/parcelles_labels?address=50+rue+des+tanneurs+aix",
        )
        self.assertEqual(
            calls[3][0].full_url,
            "http://example.test/api/v1/map-layer/iris?address=50+rue+des+tanneurs+aix",
        )
        self.assertEqual(
            calls[4][0].full_url,
            "http://example.test/api/v1/map-viewport?address=10+rue+des+cordeliers+aix&layers=context%2Ciris",
        )
        self.assertEqual(
            calls[5][0].full_url,
            "http://example.test/api/v1/map-layer/parcelles?lon=-0.542902&lat=47.468617&viewport_render_mode=features",
        )
        self.assertEqual(
            calls[6][0].full_url,
            "http://example.test/api/v1/map-viewport?layers=context%2Ciris&lon=-0.542902&lat=47.468617",
        )
        self.assertEqual(
            calls[7][0].full_url,
            "http://example.test/api/v1/map-layer/context?city_code=13001",
        )
        self.assertEqual(
            calls[8][0].full_url,
            "http://example.test/api/v1/map-viewport?city_code=13001&layers=context%2Ciris",
        )

    def test_overview_autocomplete_address_pages_and_score_routes_use_public_api_v1_paths(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"status": "ok", "items": []})

        client = OneDexClient(base_url="http://example.test", opener=opener)
        client.overview.address({
            "address": "10 rue des cordeliers aix",
            "dvf_radius_m": 600,
        })
        client.autocomplete.address({"q": "10 rue des cordeliers aix", "limit": 5})
        client.addressPages.state("10-rue-de-la-paix-paris-75002")
        client.score.grid({
            "bbox": "5.4457,43.5274,5.4468,43.5282",
            "zoom": 15,
            "category": "global",
        })
        client.score.addressSuggest({"q": "10 rue des cordeliers aix", "limit": 5})

        self.assertEqual(
            calls[0][0].full_url,
            "http://example.test/api/v1/address-overview?address=10+rue+des+cordeliers+aix&dvf_radius_m=600",
        )
        self.assertEqual(
            calls[1][0].full_url,
            "http://example.test/api/v1/autocomplete/address?q=10+rue+des+cordeliers+aix&limit=5",
        )
        self.assertEqual(
            calls[2][0].full_url,
            "http://example.test/api/v1/address-pages/10-rue-de-la-paix-paris-75002/state",
        )
        self.assertEqual(
            calls[3][0].full_url,
            "http://example.test/api/v1/score/grid?bbox=5.4457%2C43.5274%2C5.4468%2C43.5282&zoom=15&category=global",
        )
        self.assertEqual(
            calls[4][0].full_url,
            "http://example.test/api/v1/score/address-suggest?q=10+rue+des+cordeliers+aix&limit=5",
        )

    def test_score_address_and_compare_post_json_bodies(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"version": "score-v1", "items": []})

        client = OneDexClient(base_url="http://example.test", opener=opener)
        client.score.address({"items": [{"address": "10 rue des cordeliers aix"}]})
        client.score.compare({
            "items": [
                {"address": "10 rue des cordeliers aix"},
                {"address": "50 rue des tanneurs aix"},
            ],
            "sortBy": "global",
        })

        self.assertEqual(calls[0][0].full_url, "http://example.test/api/v1/score/address")
        self.assertEqual(calls[0][0].get_method(), "POST")
        self.assertEqual(
            json.loads(calls[0][0].data.decode("utf-8")),
            {"items": [{"address": "10 rue des cordeliers aix"}]},
        )
        self.assertEqual(calls[1][0].full_url, "http://example.test/api/v1/score/compare")
        self.assertEqual(calls[1][0].get_method(), "POST")
        self.assertEqual(
            json.loads(calls[1][0].data.decode("utf-8")),
            {
                "items": [
                    {"address": "10 rue des cordeliers aix"},
                    {"address": "50 rue des tanneurs aix"},
                ],
                "sortBy": "global",
            },
        )

    def test_subscriber_preview_commune_and_map_focus_helpers_use_public_api_routes(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"status": "ok"})

        client = OneDexClient(base_url="http://example.test", api_key="test-key", opener=opener)
        client.address.details({
            "normalizedAddressKey": "addr_123",
            "fields": ["summary", "rail"],
            "idempotencyKey": "details-req-123",
        })
        client.address.unlock({
            "address": "10 rue des cordeliers aix",
            "idempotency_key": "unlock-req-123",
        })
        client.account.usage()
        client.preview.byPath("/ville/aix-en-provence-13001")
        client.communes.search({"q": "aix", "limit": 3})
        client.map.focus.parcelle({"recordKey": "13001000AB0022"})
        client.map.focus.parcelles({"recordKeys": ["13001000AB0022", "13001000AB0023"]})
        client.map.focus.address({"address": "10 rue des cordeliers aix"})
        client.map.focus.publicLocation({"lon": 5.446766, "lat": 43.529667})
        client.map.focus.feature({"layerKey": "parcelles", "featureKey": "13001000AB0022"})

        self.assertEqual(
            calls[0][0].full_url,
            "http://example.test/api/v1/address-details?normalized_address_key=addr_123&fields=summary%2Crail",
        )
        self.assertEqual(calls[0][0].headers["Authorization"], "Bearer test-key")
        self.assertEqual(dict(calls[0][0].header_items())["Idempotency-key"], "details-req-123")
        self.assertEqual(calls[1][0].full_url, "http://example.test/api/v1/address-unlocks")
        self.assertEqual(calls[1][0].get_method(), "POST")
        self.assertEqual(
            json.loads(calls[1][0].data.decode("utf-8")),
            {"address": "10 rue des cordeliers aix"},
        )
        self.assertEqual(dict(calls[1][0].header_items())["Idempotency-key"], "unlock-req-123")
        self.assertEqual(calls[2][0].full_url, "http://example.test/api/v1/account/usage")
        self.assertEqual(
            calls[3][0].full_url,
            "http://example.test/api/v1/public-preview?path=%2Fville%2Faix-en-provence-13001",
        )
        self.assertEqual(calls[4][0].full_url, "http://example.test/api/v1/communes/search?q=aix&limit=3")
        self.assertEqual(calls[5][0].full_url, "http://example.test/api/v1/map-focus/parcelle?record_key=13001000AB0022")
        self.assertEqual(
            calls[6][0].full_url,
            "http://example.test/api/v1/map-focus/parcelles?record_keys=13001000AB0022%2C13001000AB0023",
        )
        self.assertEqual(
            calls[7][0].full_url,
            "http://example.test/api/v1/map-focus/address?address=10+rue+des+cordeliers+aix",
        )
        self.assertEqual(
            calls[8][0].full_url,
            "http://example.test/api/v1/map-focus/public-location?lon=5.446766&lat=43.529667",
        )
        self.assertEqual(
            calls[9][0].full_url,
            "http://example.test/api/v1/map-focus/feature?layer_key=parcelles&feature_key=13001000AB0022",
        )

    def test_subscriber_address_helpers_reject_mixed_normalized_key_and_resolved_locators(self):
        client = OneDexClient(base_url="http://example.test")

        with self.assertRaisesRegex(ValueError, "normalized_address_key alone"):
            client.address.details({
                "normalizedAddressKey": "addr_123",
                "address": "10 rue des cordeliers aix",
                "fields": "summary",
                "idempotencyKey": "details-mixed",
            })

        with self.assertRaisesRegex(ValueError, "normalized_address_key alone"):
            client.address.unlock({
                "normalizedAddressKey": "addr_123",
                "parcelRecordKey": "13001000AB0022",
                "idempotencyKey": "unlock-mixed",
            })

    def test_subscriber_address_helpers_require_explicit_idempotency_keys(self):
        client = OneDexClient(base_url="http://example.test")

        with self.assertRaisesRegex(ValueError, "requires idempotency_key"):
            client.address.details({"address": "10 rue des cordeliers aix", "fields": "summary"})
        with self.assertRaisesRegex(ValueError, "requires idempotency_key"):
            client.address.unlock({"address": "10 rue des cordeliers aix"})

    def test_idempotency_keys_reject_surrounding_whitespace_controls_and_utf8_overflow(self):
        client = OneDexClient(base_url="http://example.test")

        for idempotency_key in (" padded", "line\nbreak", "é" * 128):
            with self.subTest(idempotency_key=repr(idempotency_key)):
                with self.assertRaisesRegex(ValueError, "(whitespace|control|255 UTF-8 bytes)"):
                    client.address.unlock(address="x", idempotency_key=idempotency_key)

    def test_pythonic_keyword_helpers_and_details_url_are_safe(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"version": "address-details-v1", "fields": ["summary"]})

        client = OneDexClient(base_url="http://example.test", api_key="test-key", opener=opener)
        client.address.details(
            address="10 rue des cordeliers aix",
            fields=["summary"],
            idempotency_key="details-keyword-123",
        )
        client.address.details_url(
            "/api/v1/address-details?normalized_address_key=addr_123&fields=summary",
            idempotency_key="details-url-123",
        )

        self.assertEqual(dict(calls[0][0].header_items())["Idempotency-key"], "details-keyword-123")
        self.assertEqual(
            calls[1][0].full_url,
            "http://example.test/api/v1/address-details?normalized_address_key=addr_123&fields=summary",
        )
        self.assertEqual(dict(calls[1][0].header_items())["Idempotency-key"], "details-url-123")
        with self.assertRaisesRegex(ValueError, "configured 1dex origin"):
            client.address.details_url(
                "https://attacker.test/api/v1/address-details?fields=summary",
                idempotency_key="blocked",
            )

    def test_retryable_responses_replay_the_exact_idempotency_key(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            if len(calls) == 1:
                return FakeResponse(
                    {"status": "request_in_progress", "retry_after_seconds": 0},
                    status=202,
                    headers={"Retry-After": "0"},
                )
            if len(calls) == 2:
                raise urllib.error.HTTPError(
                    request.full_url,
                    429,
                    "Too Many Requests",
                    {"Retry-After": "0"},
                    FakeResponse({"error": "usage_limited", "retry_after_seconds": 0}),
                )
            return FakeResponse({"version": "address-unlock-v1", "result": {"status": "unlocked"}})

        client = OneDexClient(base_url="http://example.test", opener=opener, sleeper=lambda _seconds: None)
        result = client.address.unlock(
            address="10 rue des cordeliers aix",
            idempotency_key="stable-replay-key",
            max_attempts=3,
            max_retry_delay=0,
        )

        self.assertEqual(result["version"], "address-unlock-v1")
        self.assertEqual(len(calls), 3)
        self.assertEqual(
            [dict(request.header_items())["Idempotency-key"] for request, _timeout in calls],
            ["stable-replay-key", "stable-replay-key", "stable-replay-key"],
        )

    def test_pending_conflict_and_cancellation_expose_retry_metadata(self):
        def pending_opener(_request, timeout):
            del timeout
            return FakeResponse(
                {"status": "request_in_progress", "retry_after_seconds": 2},
                status=202,
                headers={"Retry-After": "2"},
            )

        pending_client = OneDexClient(base_url="http://example.test", opener=pending_opener)
        with self.assertRaises(OneDexApiError) as pending_context:
            pending_client.address.unlock(address="x", idempotency_key="pending-key")
        self.assertEqual(pending_context.exception.status, 202)
        self.assertTrue(pending_context.exception.retryable)
        self.assertEqual(pending_context.exception.retry_after_seconds, 2)
        self.assertEqual(pending_context.exception.code, "request_in_progress")

        def conflict_opener(request, timeout):
            del timeout
            raise urllib.error.HTTPError(
                request.full_url,
                409,
                "Conflict",
                {},
                FakeResponse({"error": "idempotency_conflict"}),
            )

        conflict_client = OneDexClient(base_url="http://example.test", opener=conflict_opener)
        with self.assertRaises(OneDexApiError) as conflict_context:
            conflict_client.address.unlock(address="x", idempotency_key="conflict-key", max_attempts=3)
        self.assertEqual(conflict_context.exception.status, 409)
        self.assertFalse(conflict_context.exception.retryable)

        cancel_event = threading.Event()
        calls = 0

        def cancel_opener(_request, timeout):
            del timeout
            nonlocal calls
            calls += 1
            cancel_event.set()
            return FakeResponse(
                {"status": "request_in_progress", "retry_after_seconds": 60},
                status=202,
                headers={"Retry-After": "60"},
            )

        cancel_client = OneDexClient(base_url="http://example.test", opener=cancel_opener)
        with self.assertRaisesRegex(OneDexApiError, "aborted"):
            cancel_client.address.details(
                address="10 rue des cordeliers aix",
                fields="summary",
                idempotency_key="cancel-key",
                max_attempts=3,
                cancel_event=cancel_event,
            )
        self.assertEqual(calls, 1)

    def test_unknown_public_map_layer_is_rejected_locally(self):
        client = OneDexClient()

        with self.assertRaisesRegex(ValueError, "Unsupported public map layer"):
            client.map.layer({
                "layer": "transactions",
                "address": "50 rue des tanneurs aix",
            })

    def test_http_error_raises_api_error(self):
        def opener(request, timeout):
            raise urllib.error.HTTPError(
                request.full_url,
                400,
                "Bad Request",
                {},
                FakeResponse({
                    "request_id": "req_error",
                    "warnings": [{"message": "Bad query."}],
                }),
            )

        client = OneDexClient(base_url="http://example.test", opener=opener)

        with self.assertRaises(OneDexApiError) as context:
            client.map.parcelles({"address": "x"})

        self.assertEqual(context.exception.status, 400)
        self.assertEqual(context.exception.request_id, "req_error")
        self.assertEqual(str(context.exception), "Bad query.")

    def test_network_error_raises_api_error_with_status_zero(self):
        def opener(request, timeout):
            raise urllib.error.URLError("network down")

        client = OneDexClient(base_url="http://example.test", opener=opener)

        with self.assertRaises(OneDexApiError) as context:
            client.map.parcelles({"address": "x"})

        self.assertEqual(context.exception.status, 0)
        self.assertEqual(str(context.exception), "Unable to reach 1dex API: network down")


if __name__ == "__main__":
    unittest.main()
