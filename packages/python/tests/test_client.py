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
            "address_slug": "10-rue-des-cordeliers-aix-en-provence-13100",
            "city_code": "13001",
            "lon": 5.446765371857839,
            "lat": 43.52966775616209,
            "parcel_record_key": "13001000AS0323",
            "parcel_phase": "initial",
            "viewport_bbox": "5.44628,43.52926,5.44725,43.53008",
            "viewport_zoom": 19.25,
            "viewport_render_mode": "features",
        })

        request, timeout = calls[0]
        self.assertEqual(
            request.full_url,
            "http://example.test/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features",
        )
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(timeout, 30.0)

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
            client.map.parcelles({"address_slug": "x", "city_code": "13001", "lon": 1, "lat": 2})

        self.assertEqual(context.exception.status, 400)
        self.assertEqual(context.exception.request_id, "req_error")
        self.assertEqual(str(context.exception), "Bad query.")


if __name__ == "__main__":
    unittest.main()
