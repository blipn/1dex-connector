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
