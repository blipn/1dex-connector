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

test('address.resolve posts a string as an address payload', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test/',
    apiKey: 'test-key',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({
        request_id: 'req_1',
        status: 'ok',
        data: {},
        warnings: [],
        query: { normalized_address: null, match_score: null },
        source: {
          source_key: 'address-resolution',
          dataset_updated_at: null,
          method: 'internal_component',
          limitations: [],
        },
        meta: { pagination: null },
      });
    },
  });

  await client.address.resolve('10 rue de la Paix, Paris');

  assert.equal(calls[0].url, 'http://example.test/v1/address/resolve');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    address: '10 rue de la Paix, Paris',
  });
});

test('address.autocomplete builds a query string', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({ status: 'ok' });
    },
  });

  await client.address.autocomplete('10 rue', { limit: 3 });

  assert.equal(calls[0].url, 'http://example.test/v1/address/autocomplete?q=10+rue&limit=3');
  assert.equal(calls[0].init.method, 'GET');
});

test('source.query encodes the source key path segment', async () => {
  const calls = [];
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return createJsonResponse({ status: 'ok' });
    },
  });

  await client.source.query('dvf', { address: 'Paris' });

  assert.equal(calls[0].url, 'http://example.test/v1/address/sources/dvf');
  assert.deepEqual(JSON.parse(calls[0].init.body), { address: 'Paris' });
});

test('non-2xx responses raise OneDexApiError with response metadata', async () => {
  const client = new OneDexClient({
    baseUrl: 'http://example.test',
    fetch: async () => createJsonResponse({
      request_id: 'req_error',
      warnings: [{ code: 'INVALID_QUERY', message: 'Bad address.' }],
    }, { status: 400 }),
  });

  await assert.rejects(
    () => client.address.resolve({}),
    (error) => {
      assert.ok(error instanceof OneDexApiError);
      assert.equal(error.status, 400);
      assert.equal(error.requestId, 'req_error');
      assert.equal(error.message, 'Bad address.');
      return true;
    },
  );
});
