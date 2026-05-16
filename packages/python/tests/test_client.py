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
    def test_address_resolve_posts_payload(self):
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse({"status": "ok"})

        client = OneDexClient(
            base_url="http://example.test/",
            api_key="test-key",
            opener=opener,
        )

        client.address.resolve("10 rue de la Paix, Paris")

        request, timeout = calls[0]
        self.assertEqual(request.full_url, "http://example.test/v1/address/resolve")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.headers["Authorization"], "Bearer test-key")
        self.assertEqual(json.loads(request.data.decode("utf-8")), {
            "address": "10 rue de la Paix, Paris",
        })
        self.assertEqual(timeout, 30.0)

    def test_autocomplete_uses_query_string(self):
        calls = []

        def opener(request, timeout):
            calls.append(request)
            return FakeResponse({"status": "ok"})

        client = OneDexClient(base_url="http://example.test", opener=opener)
        client.address.autocomplete("10 rue", limit=3)

        self.assertEqual(
            calls[0].full_url,
            "http://example.test/v1/address/autocomplete?q=10+rue&limit=3",
        )

    def test_http_error_raises_api_error(self):
        def opener(request, timeout):
            raise urllib.error.HTTPError(
                request.full_url,
                400,
                "Bad Request",
                {},
                FakeResponse({
                    "request_id": "req_error",
                    "warnings": [{"message": "Bad address."}],
                }),
            )

        client = OneDexClient(base_url="http://example.test", opener=opener)

        with self.assertRaises(OneDexApiError) as context:
            client.address.resolve({})

        self.assertEqual(context.exception.status, 400)
        self.assertEqual(context.exception.request_id, "req_error")
        self.assertEqual(str(context.exception), "Bad address.")


if __name__ == "__main__":
    unittest.main()
