import json
import sys
import unittest
import urllib.error
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from onedex import OneDexApiError, OneDexClient  # noqa: E402


class FakeResponse:
    def __init__(self, body):
        self._body = json.dumps(body).encode("utf-8")

    def read(self):
        return self._body

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class ClientTest(unittest.TestCase):
    def test_default_base_url_uses_public_1dex_host(self):
        client = OneDexClient()
        self.assertEqual(client.base_url, "https://1dex.fr")

    def test_map_parcelles_uses_working_public_path(self):
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
            "http://example.test/explore/map-layer/parcelles?address=50+rue+des+tanneurs+aix&viewport_render_mode=features",
        )
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(timeout, 30.0)

    def test_map_layer_helpers_use_verified_public_paths(self):
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
        client.map.layer({
            "layer": "iris",
            "address": "50 rue des tanneurs aix",
        })

        self.assertEqual(
            calls[0][0].full_url,
            "http://example.test/explore/map-layer/parcelles_dvf?address=50+rue+des+tanneurs+aix&viewport_render_mode=features",
        )
        self.assertEqual(
            calls[1][0].full_url,
            "http://example.test/explore/map-layer/parcelles_travaux?address=50+rue+des+tanneurs+aix&viewport_render_mode=features",
        )
        self.assertEqual(
            calls[2][0].full_url,
            "http://example.test/explore/map-layer/iris?address=50+rue+des+tanneurs+aix",
        )

    def test_overview_address_uses_public_api_v1_path(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"version": "address-overview-v1", "cards": []})

        client = OneDexClient(base_url="http://example.test", opener=opener)
        client.overview.address({
            "address": "10 rue des cordeliers aix",
            "dvf_radius_m": 300,
        })

        self.assertEqual(
            calls[0][0].full_url,
            "http://example.test/api/v1/address-overview?address=10+rue+des+cordeliers+aix&dvf_radius_m=300",
        )
        self.assertEqual(calls[0][0].get_method(), "GET")

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


if __name__ == "__main__":
    unittest.main()
