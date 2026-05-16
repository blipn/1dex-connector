import assert from 'node:assert/strict';
import test from 'node:test';

import { OneDexApiError, OneDexClient } from '../src/index.js';

function createJsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

test('defaults to the public 1dex host', () => {
  const client = new OneDexClient({ fetch: async () => createJsonResponse({ status: 'success' }) });
  assert.equal(client.baseUrl, 'https://1dex.fr');
});

test('map.parcelles builds the working public 1dex map-layer URL', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({ status: 'success' });
    },
  });

  await client.map.parcelles({
    address: '50 rue des tanneurs aix',
    viewport_render_mode: 'features',
  });

  assert.equal(
    calls[0].url,
    'http://example.test/explore/map-layer/parcelles?address=50+rue+des+tanneurs+aix&viewport_render_mode=features',
  );
  assert.equal(calls[0].init.method, 'GET');
});

test('non-2xx responses raise OneDexApiError with response metadata', async () => {
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async () => createJsonResponse({
      request_id: 'req_error',
      warnings: [{ code: 'INVALID_QUERY', message: 'Bad query.' }],
    }, { status: 400 }),
  });

  await assert.rejects(
    () => client.map.parcelles({ address: 'x' }),
    (error) => {
      assert.ok(error instanceof OneDexApiError);
      assert.equal(error.status, 400);
      assert.equal(error.requestId, 'req_error');
      assert.equal(error.message, 'Bad query.');
      return true;
    },
  );
});
