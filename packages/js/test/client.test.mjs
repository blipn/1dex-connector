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

test('map.parcelles builds the canonical public api v1 map-layer URL', async () => {
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
    'http://example.test/api/v1/map-layer/parcelles?address=50+rue+des+tanneurs+aix&viewport_render_mode=features',
  );
  assert.equal(calls[0].init.method, 'GET');
});

test('map namespace covers public dvf, travaux, labels, viewport, and generic layer URLs', async () => {
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
  await client.map.labels({ address: '50 rue des tanneurs aix' });
  await client.map.layer({ layer: 'iris', address: '50 rue des tanneurs aix' });
  await client.map.viewport({ layers: 'context,iris', address: '10 rue des cordeliers aix' });
  await client.map.layer({ layer: 'parcelles', lon: -0.542902, lat: 47.468617, viewport_render_mode: 'features' });
  await client.map.viewport({ layers: 'context,iris', lon: -0.542902, lat: 47.468617 });

  assert.equal(
    calls[0].url,
    'http://example.test/api/v1/map-layer/parcelles_dvf?address=50+rue+des+tanneurs+aix&viewport_render_mode=features',
  );
  assert.equal(
    calls[1].url,
    'http://example.test/api/v1/map-layer/parcelles_travaux?address=50+rue+des+tanneurs+aix&viewport_render_mode=features',
  );
  assert.equal(
    calls[2].url,
    'http://example.test/api/v1/map-layer/parcelles_labels?address=50+rue+des+tanneurs+aix',
  );
  assert.equal(
    calls[3].url,
    'http://example.test/api/v1/map-layer/iris?address=50+rue+des+tanneurs+aix',
  );
  assert.equal(
    calls[4].url,
    'http://example.test/api/v1/map-viewport?address=10+rue+des+cordeliers+aix&layers=context%2Ciris',
  );
  assert.equal(
    calls[5].url,
    'http://example.test/api/v1/map-layer/parcelles?lon=-0.542902&lat=47.468617&viewport_render_mode=features',
  );
  assert.equal(
    calls[6].url,
    'http://example.test/api/v1/map-viewport?lon=-0.542902&lat=47.468617&layers=context%2Ciris',
  );
});

test('overview, autocomplete, addressPages, and score helpers build canonical public API URLs', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({ status: 'ok', items: [] });
    },
  });

  await client.overview.address({
    address: '10 rue des cordeliers aix',
    dvf_radius_m: 600,
  });
  await client.autocomplete.address({ q: '10 rue des cordeliers aix', limit: 5 });
  await client.addressPages.state('10-rue-de-la-paix-paris-75002');
  await client.score.grid({ bbox: '5.4457,43.5274,5.4468,43.5282', zoom: 15, category: 'global' });
  await client.score.addressSuggest({ q: '10 rue des cordeliers aix', limit: 5 });

  assert.equal(
    calls[0].url,
    'http://example.test/api/v1/address-overview?address=10+rue+des+cordeliers+aix&dvf_radius_m=600',
  );
  assert.equal(
    calls[1].url,
    'http://example.test/api/v1/autocomplete/address?q=10+rue+des+cordeliers+aix&limit=5',
  );
  assert.equal(
    calls[2].url,
    'http://example.test/api/v1/address-pages/10-rue-de-la-paix-paris-75002/state',
  );
  assert.equal(
    calls[3].url,
    'http://example.test/api/v1/score/grid?bbox=5.4457%2C43.5274%2C5.4468%2C43.5282&zoom=15&category=global',
  );
  assert.equal(
    calls[4].url,
    'http://example.test/api/v1/score/address-suggest?q=10+rue+des+cordeliers+aix&limit=5',
  );
});

test('score address and compare helpers POST JSON bodies', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({ version: 'score-v1', items: [] });
    },
  });

  await client.score.address({ items: [{ address: '10 rue des cordeliers aix' }] });
  await client.score.compare({
    items: [{ address: '10 rue des cordeliers aix' }, { address: '50 rue des tanneurs aix' }],
    sortBy: 'global',
  });

  assert.equal(calls[0].url, 'http://example.test/api/v1/score/address');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.body, JSON.stringify({ items: [{ address: '10 rue des cordeliers aix' }] }));
  assert.equal(calls[1].url, 'http://example.test/api/v1/score/compare');
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(
    calls[1].init.body,
    JSON.stringify({
      items: [{ address: '10 rue des cordeliers aix' }, { address: '50 rue des tanneurs aix' }],
      sortBy: 'global',
    }),
  );
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
