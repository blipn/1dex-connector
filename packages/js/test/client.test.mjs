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

test('map layer helpers build verified public DVF and travaux URLs', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({ status: 'success' });
    },
  });

  await client.map.dvf({ address: '50 rue des tanneurs aix', viewport_render_mode: 'features' });
  await client.map.travaux({ address: '50 rue des tanneurs aix', viewport_render_mode: 'features' });
  await client.map.layer({ layer: 'iris', address: '50 rue des tanneurs aix' });

  assert.equal(
    calls[0].url,
    'http://example.test/explore/map-layer/parcelles_dvf?address=50+rue+des+tanneurs+aix&viewport_render_mode=features',
  );
  assert.equal(
    calls[1].url,
    'http://example.test/explore/map-layer/parcelles_travaux?address=50+rue+des+tanneurs+aix&viewport_render_mode=features',
  );
  assert.equal(
    calls[2].url,
    'http://example.test/explore/map-layer/iris?address=50+rue+des+tanneurs+aix',
  );
});

test('overview.address builds the public api v1 address overview URL', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({ version: 'address-overview-v1', cards: [] });
    },
  });

  await client.overview.address({
    address: '10 rue des cordeliers aix',
    dvf_radius_m: 600,
  });

  assert.equal(
    calls[0].url,
    'http://example.test/api/v1/address-overview?address=10+rue+des+cordeliers+aix&dvf_radius_m=600',
  );
  assert.equal(calls[0].init.method, 'GET');
});

test('unknown public map layer is rejected locally', async () => {
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async () => createJsonResponse({ status: 'success' }),
  });

  assert.throws(
    () => client.map.layer({ layer: 'transactions', address: '50 rue des tanneurs aix' }),
    /Unsupported public map layer/u,
  );
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
