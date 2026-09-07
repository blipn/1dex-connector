import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { OneDexApiError, OneDexClient } from '../src/index.js';

async function serverFor(t, handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('timeout covers a response whose headers arrive before its body', async t => {
  const baseUrl = await serverFor(t, (_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.flushHeaders();
  });
  const client = new OneDexClient({ baseUrl, timeoutMs: 100 });
  await assert.rejects(client.account.usage(), error =>
    error instanceof OneDexApiError && error.status === 0 && /timed out/.test(error.message));
});

test('caller cancellation interrupts reading the response body', async t => {
  const controller = new AbortController();
  const baseUrl = await serverFor(t, (_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.flushHeaders();
    setTimeout(() => controller.abort(), 50);
  });
  const client = new OneDexClient({ baseUrl });
  await assert.rejects(client.account.usage({ signal: controller.signal }), /request aborted/);
});

test('redirects cannot forward API keys or replay unlock requests', async t => {
  let leakedRequests = 0;
  const destination = await serverFor(t, (_request, response) => {
    leakedRequests++;
    response.end('{}');
  });
  const baseUrl = await serverFor(t, (_request, response) => {
    response.writeHead(307, { location: destination });
    response.end();
  });
  const client = new OneDexClient({ baseUrl, headers: { 'X-1dex-Api-Key': 'test-only-key' } });
  await assert.rejects(client.address.unlock({ address: 'fixture', idempotencyKey: 'one-intent' }), OneDexApiError);
  assert.equal(leakedRequests, 0);
});

test('a wait budget stops retries instead of shortening Retry-After', async () => {
  let calls = 0;
  const client = new OneDexClient({ fetch: async () => {
    calls++;
    return new Response('upstream busy', { status: 503, headers: { 'retry-after': '60', 'x-request-id': 'busy-1' } });
  } });
  await assert.rejects(client.account.usage({ retry: { maxAttempts: 3, maxDelayMs: 0 } }), error => {
    assert.equal(error.status, 503);
    assert.equal(error.retryAfterSeconds, 60);
    assert.equal(error.requestId, 'busy-1');
    assert.equal(error.retryable, true);
    return true;
  });
  assert.equal(calls, 1);
});

test('non-JSON backpressure retries with the same key when the deadline allows it', async () => {
  const keys = [];
  const client = new OneDexClient({ fetch: async (_url, init) => {
    keys.push(new Headers(init.headers).get('idempotency-key'));
    return keys.length === 1
      ? new Response('<html>Busy</html>', { status: 429, headers: { 'retry-after': '0' } })
      : new Response('{"version":"address-unlock-v1"}');
  } });
  await client.address.unlock({ address: 'fixture', idempotencyKey: 'same-intent' }, { retry: true });
  assert.deepEqual(keys, ['same-intent', 'same-intent']);
});

test('API-root base URLs and differently cased default headers remain unambiguous', async () => {
  let captured;
  const client = new OneDexClient({
    baseUrl: 'https://1dex.fr/api/v1/',
    headers: { 'idempotency-key': 'old-intent', Authorization: 'old-key' },
    fetch: async (url, init) => {
      captured = { url, headers: new Headers(init.headers) };
      return new Response('{}');
    },
  });
  await client.address.details({ address: 'fixture', fields: 'summary' }, {
    idempotencyKey: 'new-intent', headers: { authorization: 'new-key' },
  });
  assert.equal(new URL(captured.url).pathname, '/api/v1/address-details');
  assert.equal(captured.headers.get('idempotency-key'), 'new-intent');
  assert.equal(captured.headers.get('authorization'), 'new-key');
});

test('HTTP-date and very long Retry-After values do not cause premature retries', async () => {
  for (const delay of [new Date(Date.now() + 60_000).toUTCString(), '2147483648']) {
    let calls = 0;
    const client = new OneDexClient({ fetch: async () => {
      calls++;
      return new Response('{}', { status: 429, headers: { 'retry-after': delay } });
    } });
    await assert.rejects(client.account.usage({ retry: { maxAttempts: 2, maxDelayMs: 10 } }), error =>
      error.status === 429 && error.retryAfterSeconds >= 58);
    assert.equal(calls, 1);
  }
});
