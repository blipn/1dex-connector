import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = resolve(__dirname, '../src/cli.js');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ONEDEX_NO_UPDATE_CHECK: '1',
    },
  });
}

function runCliAsync(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env: {
        ...process.env,
        ONEDEX_NO_UPDATE_CHECK: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', rejectPromise);
    child.on('close', (status, signal) => {
      resolvePromise({ status, signal, stdout, stderr });
    });
  });
}

async function withJsonServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise((resolvePromise, rejectPromise) => {
      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }
        resolvePromise();
      });
    });
  }
}

test('overview --url builds the public address overview URL', () => {
  const result = runCli([
    'overview',
    '--address',
    '10 rue des cordeliers aix',
    '--dvf-radius-m',
    '300',
    '--url',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    'https://1dex.fr/api/v1/address-overview?address=10+rue+des+cordeliers+aix&dvf_radius_m=300',
  );
});

test('overview --url supports current location parameters from the live OpenAPI', () => {
  const result = runCli([
    'overview',
    '--city-code',
    '13001',
    '--parcel-record-key',
    'parcel_123',
    '--dvf-year',
    '2024',
    '--url',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    'https://1dex.fr/api/v1/address-overview?city_code=13001&parcel_record_key=parcel_123&dvf_radius_m=600&dvf_year=2024',
  );
});

test('help exposes the broader public API command surface', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1dex overview <address\|--city-code\|--lon\/--lat\|--parcel-record-key> \[options\]/u);
  assert.match(result.stdout, /1dex autocomplete <query> \[options\]/u);
  assert.match(result.stdout, /1dex score address <address> \[options\]/u);
  assert.match(result.stdout, /--input <json-or-@file>/u);
  assert.match(result.stdout, /--parcel-record-key <key>/u);
});

test('bare address command still targets the public address overview URL', () => {
  const result = runCli([
    '50 rue des tanneurs aix',
    '--url',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    'https://1dex.fr/api/v1/address-overview?address=50+rue+des+tanneurs+aix&dvf_radius_m=600',
  );
});

test('--address without a positional command still targets the public address overview URL', () => {
  const result = runCli([
    '--address',
    '50 rue des tanneurs aix',
    '--url',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    'https://1dex.fr/api/v1/address-overview?address=50+rue+des+tanneurs+aix&dvf_radius_m=600',
  );
});

test('map layer command builds canonical public layer URLs', () => {
  const result = runCli([
    'dvf',
    '--address',
    '50 rue des tanneurs aix',
    '--lon',
    '-0.542902',
    '--lat',
    '47.468617',
    '--url',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    'https://1dex.fr/api/v1/map-layer/parcelles_dvf?address=50+rue+des+tanneurs+aix&lon=-0.542902&lat=47.468617&viewport_render_mode=features',
  );
});

test('autocomplete, state, viewport, and score grid build canonical public URLs', () => {
  assert.equal(
    runCli(['autocomplete', '10 rue des cordeliers aix', '--limit', '5', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/autocomplete/address?q=10+rue+des+cordeliers+aix&limit=5',
  );
  assert.equal(
    runCli(['state', '10-rue-de-la-paix-paris-75002', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/address-pages/10-rue-de-la-paix-paris-75002/state',
  );
  assert.equal(
    runCli(['viewport', '10 rue des cordeliers aix', '--layers', 'context,iris', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-viewport?address=10+rue+des+cordeliers+aix&layers=context%2Ciris',
  );
  assert.equal(
    runCli(['viewport', '--layers', 'context,iris', '--lon', '-0.542902', '--lat', '47.468617', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-viewport?layers=context%2Ciris&lon=-0.542902&lat=47.468617',
  );
  assert.equal(
    runCli(['viewport', '--layers', 'context,iris', '--city-code', '13001', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-viewport?layers=context%2Ciris&city_code=13001',
  );
  assert.equal(
    runCli(['context', '--city-code', '13001', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-layer/context?city_code=13001&viewport_render_mode=features',
  );
  assert.equal(
    runCli(['score', 'grid', '--bbox', '5.4457,43.5274,5.4468,43.5282', '--zoom', '15', '--category', 'global', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/score/grid?bbox=5.4457%2C43.5274%2C5.4468%2C43.5282&zoom=15&category=global',
  );
});

test('new public and subscriber commands build canonical URLs', () => {
  assert.equal(
    runCli(['details', '--normalized-address-key', 'addr_123', '--fields', 'summary,rail', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/address-details?normalized_address_key=addr_123&fields=summary%2Crail',
  );
  assert.equal(
    runCli(['unlock', '10 rue des cordeliers aix', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/address-unlocks',
  );
  assert.equal(
    runCli(['usage', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/account/usage',
  );
  assert.equal(
    runCli(['communes', 'aix', '--limit', '3', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/communes/search?q=aix&limit=3',
  );
  assert.equal(
    runCli(['preview', '/ville/aix-en-provence-13001', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/public-preview?path=%2Fville%2Faix-en-provence-13001',
  );
  assert.equal(
    runCli(['focus', 'parcelle', '13001000AB0022', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-focus/parcelle?record_key=13001000AB0022',
  );
  assert.equal(
    runCli(['focus', 'parcelles', '13001000AB0022,13001000AB0023', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-focus/parcelles?record_keys=13001000AB0022%2C13001000AB0023',
  );
  assert.equal(
    runCli(['focus', 'address', '10 rue des cordeliers aix', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-focus/address?address=10+rue+des+cordeliers+aix',
  );
  assert.equal(
    runCli(['focus', 'public-location', '--lon', '5.446766', '--lat', '43.529667', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-focus/public-location?lon=5.446766&lat=43.529667',
  );
  assert.equal(
    runCli(['focus', 'feature', '--layer-key', 'parcelles', '--feature-key', '13001000AB0022', '--url']).stdout.trim(),
    'https://1dex.fr/api/v1/map-focus/feature?layer_key=parcelles&feature_key=13001000AB0022',
  );
});

test('subscriber commands reject mixed normalized key and resolved locators', () => {
  const details = runCli([
    'details',
    '10 rue des cordeliers aix',
    '--normalized-address-key',
    'addr_123',
    '--fields',
    'summary',
  ]);
  assert.equal(details.status, 1);
  assert.match(details.stderr, /normalized_address_key alone/u);

  const unlock = runCli([
    'unlock',
    '--normalized-address-key',
    'addr_123',
    '--parcel-record-key',
    '13001000AB0022',
  ]);
  assert.equal(unlock.status, 1);
  assert.match(unlock.stderr, /normalized_address_key alone/u);

  const unlockInput = runCli([
    'unlock',
    '10 rue des cordeliers aix',
    '--input',
    '{"address":"50 rue des tanneurs aix"}',
  ]);
  assert.equal(unlockInput.status, 1);
  assert.match(unlockInput.stderr, /--input cannot be combined/u);
});

test('overview still supports CSV output for address-overview cards', async () => {
  await withJsonServer((request, response) => {
    assert.equal(request.url, '/api/v1/address-overview?address=10+rue+des+cordeliers+aix&dvf_radius_m=600');
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      version: 'address-overview-v1',
      cards: [
        {
          eyebrow: 'Marché',
          label: 'Prix moyen',
          value: '5 200 €/m²',
          detail: 'Transactions récentes',
          tabKey: 'market',
          sectionKey: 'pricing',
        },
      ],
    }));
  }, async (baseUrl) => {
    const result = await runCliAsync([
      'overview',
      '10 rue des cordeliers aix',
      '--format',
      'csv',
      '--base-url',
      baseUrl,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout.trim(),
      [
        'eyebrow,label,value,detail,tabKey,sectionKey',
        'Marché,Prix moyen,5 200 €/m²,Transactions récentes,market,pricing',
      ].join('\n'),
    );
  });
});

test('address unlock posts JSON and forwards subscriber API key', async () => {
  await withJsonServer((request, response) => {
    assert.equal(request.url, '/api/v1/address-unlocks');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.authorization, 'Bearer test-key');
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      assert.deepEqual(JSON.parse(body), { address: '10 rue des cordeliers aix' });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        version: 'address-unlock-v1',
        normalized_address_key: 'addr_123',
        result: { status: 'unlocked' },
        details_url: '/api/v1/address-details?normalized_address_key=addr_123&fields=summary',
      }));
    });
  }, async (baseUrl) => {
    const result = await runCliAsync([
      'unlock',
      '10 rue des cordeliers aix',
      '--api-key',
      'test-key',
      '--format',
      'summary',
      '--base-url',
      baseUrl,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout.trim(),
      [
        'version=address-unlock-v1',
        'normalized_address_key=addr_123',
        'status=unlocked',
        'details_url=/api/v1/address-details?normalized_address_key=addr_123&fields=summary',
      ].join('\n'),
    );
  });
});

test('address unlock accepts returned unlock_request JSON input', async () => {
  await withJsonServer((request, response) => {
    assert.equal(request.url, '/api/v1/address-unlocks');
    assert.equal(request.method, 'POST');
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      assert.deepEqual(JSON.parse(body), {
        address: '10 rue des cordeliers aix',
        city_code: '13001',
      });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        version: 'address-unlock-v1',
        normalized_address_key: 'addr_123',
        result: { status: 'unlocked' },
        details_url: '/api/v1/address-details?address=10+rue+des+cordeliers+aix&city_code=13001&fields=summary',
      }));
    });
  }, async (baseUrl) => {
    const result = await runCliAsync([
      'unlock',
      '--input',
      '{"address":"10 rue des cordeliers aix","city_code":"13001"}',
      '--base-url',
      baseUrl,
    ]);

    assert.equal(result.status, 0, result.stderr);
  });
});

test('score address posts JSON and supports summary output', async () => {
  await withJsonServer((request, response) => {
    assert.equal(request.url, '/api/v1/score/address');
    assert.equal(request.method, 'POST');
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      assert.deepEqual(JSON.parse(body), { items: [{ address: '10 rue des cordeliers aix' }] });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        version: 'score-v1',
        score_model_version: 'score-model-v2',
        items: [
          {
            address: { label: '10 Rue des Cordeliers 13100 Aix-en-Provence' },
            score: { global: 71, label: 'Favorable', confidence: 'solid' },
          },
        ],
        warnings: [],
      }));
    });
  }, async (baseUrl) => {
    const result = await runCliAsync([
      'score',
      'address',
      '10 rue des cordeliers aix',
      '--format',
      'summary',
      '--base-url',
      baseUrl,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout.trim(),
      [
        'version=score-v1',
        'items=1',
        'warnings=0',
        '10 Rue des Cordeliers 13100 Aix-en-Provence | global=71 | Favorable | solid',
      ].join('\n'),
    );
  });
});

test('score compare accepts inline JSON input', async () => {
  await withJsonServer((request, response) => {
    assert.equal(request.url, '/api/v1/score/compare');
    assert.equal(request.method, 'POST');
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      assert.deepEqual(JSON.parse(body), {
        items: [{ address: '10 rue des cordeliers aix' }, { address: '50 rue des tanneurs aix' }],
        sortBy: 'global',
      });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        version: 'score-v1',
        sortBy: 'global',
        summary: { text: 'Les adresses restent proches sur les signaux disponibles.' },
        ranking: [
          { rank: 1, itemIndex: 1, label: 'Rue des Tanneurs 13100 Aix-en-Provence', globalScore: 72, sortScore: 72 },
          { rank: 2, itemIndex: 0, label: '10 Rue des Cordeliers 13100 Aix-en-Provence', globalScore: 71, sortScore: 71 },
        ],
      }));
    });
  }, async (baseUrl) => {
    const result = await runCliAsync([
      'score',
      'compare',
      '--input',
      '{"items":[{"address":"10 rue des cordeliers aix"},{"address":"50 rue des tanneurs aix"}],"sortBy":"global"}',
      '--format',
      'csv',
      '--base-url',
      baseUrl,
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout.trim(),
      [
        'rank,itemIndex,label,globalScore,sortScore,bestCategory,mainCheck',
        '1,1,Rue des Tanneurs 13100 Aix-en-Provence,72,72,,',
        '2,0,10 Rue des Cordeliers 13100 Aix-en-Provence,71,71,,',
      ].join('\n'),
    );
  });
});
