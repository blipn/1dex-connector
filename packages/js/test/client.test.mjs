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
    addressSlug: '10-rue-des-cordeliers-aix-en-provence-13100',
    city_code: '13001',
    lon: 5.446765371857839,
    lat: 43.52966775616209,
    parcel_record_key: '13001000AS0323',
    parcel_phase: 'initial',
    viewport_bbox: '5.44628,43.52926,5.44725,43.53008',
    viewport_zoom: 19.25,
    viewport_render_mode: 'features',
  });

  assert.equal(
    calls[0].url,
    'http://example.test/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features',
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
    () => client.map.parcelles({ addressSlug: 'x', city_code: '13001', lon: 1, lat: 2 }),
    (error) => {
      assert.ok(error instanceof OneDexApiError);
      assert.equal(error.status, 400);
      assert.equal(error.requestId, 'req_error');
      assert.equal(error.message, 'Bad query.');
      return true;
    },
  );
});
