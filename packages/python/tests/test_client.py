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
