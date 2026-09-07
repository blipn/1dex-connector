import io
import json
import sys
import threading
import unittest
import urllib.error
from contextlib import contextmanager
from email.utils import formatdate
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from onedex import OneDexApiError, OneDexClient
from test_client import FakeResponse


@contextmanager
def http_server(handler):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


class TransportTest(unittest.TestCase):
    def test_api_root_url_and_cased_headers_produce_one_key(self):
        calls = []

        def opener(request, timeout):
            calls.append(request)
            return FakeResponse({})

        client = OneDexClient(
            base_url="https://1dex.fr/api/v1/", opener=opener,
            headers={"Idempotency-Key": "old-intent", "Authorization": "old-key"},
        )
        client.request("GET", "/api/v1/account/usage", idempotency_key="new-intent", headers={"authorization": "new-key"})
        self.assertEqual(calls[0].full_url, "https://1dex.fr/api/v1/account/usage")
        self.assertEqual(calls[0].get_header("Idempotency-key"), "new-intent")
        self.assertEqual(calls[0].get_header("Authorization"), "new-key")

    def test_wait_budget_never_shortens_server_retry_after(self):
        calls = []
        sleeps = []

        def opener(request, timeout):
            calls.append(request)
            raise urllib.error.HTTPError(request.full_url, 503, "Busy", {"Retry-After": "60"}, io.BytesIO(b"upstream busy"))

        client = OneDexClient(opener=opener, sleeper=sleeps.append)
        with self.assertRaises(OneDexApiError) as caught:
            client.request("GET", "/api/v1/account/usage", max_attempts=3, max_retry_delay=0)
        self.assertEqual(caught.exception.status, 503)
        self.assertEqual(caught.exception.retry_after_seconds, 60)
        self.assertTrue(caught.exception.retryable)
        self.assertEqual(len(calls), 1)
        self.assertEqual(sleeps, [])

    def test_http_date_fractional_and_invalid_retry_after(self):
        for value, expected in [(formatdate(1_700_000_060, usegmt=True), 60), ("2.2", 3), ("inf", None), ("NaN", None)]:
            with self.subTest(value=value):
                def opener(request, timeout):
                    raise urllib.error.HTTPError(request.full_url, 429, "Busy", {"Retry-After": value}, io.BytesIO(b"{}"))
                with patch("onedex.client.time.time", return_value=1_700_000_000):
                    with self.assertRaises(OneDexApiError) as caught:
                        OneDexClient(opener=opener).account.usage()
                self.assertEqual(caught.exception.status, 429)
                self.assertEqual(caught.exception.retry_after_seconds, expected)

    def test_non_json_backpressure_keeps_idempotency_during_retry(self):
        keys = []

        def opener(request, timeout):
            keys.append(request.get_header("Idempotency-key"))
            if len(keys) == 1:
                raise urllib.error.HTTPError(request.full_url, 429, "Busy", {"Retry-After": "0"}, io.BytesIO(b"<html>Busy</html>"))
            return FakeResponse({"version": "address-unlock-v1"})

        OneDexClient(opener=opener).address.unlock(address="fixture", idempotency_key="one-intent", max_attempts=2)
        self.assertEqual(keys, ["one-intent", "one-intent"])

    def test_redirects_do_not_forward_api_credentials(self):
        requests = []

        class Receiver(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                requests.append(dict(self.headers))
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"{}")

        with http_server(Receiver) as destination:
            class Redirect(Receiver):
                def do_GET(self):
                    self.send_response(302)
                    self.send_header("Location", destination)
                    self.end_headers()

            with http_server(Redirect) as base_url:
                client = OneDexClient(base_url=base_url, api_key="test-only-key", headers={"X-1dex-Api-Key": "other-test-key"})
                with self.assertRaises(OneDexApiError) as caught:
                    client.account.usage()
                self.assertEqual(caught.exception.status, 302)
        self.assertEqual(requests, [])


if __name__ == "__main__":
    unittest.main()
