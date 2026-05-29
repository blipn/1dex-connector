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

test('help exposes the overview command', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1dex overview <address> \[options\]/u);
  assert.match(result.stdout, /--dvf-radius-m <number>/u);
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

test('map layer command still builds public layer URLs', () => {
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
    'https://1dex.fr/explore/map-layer/parcelles_dvf?address=50+rue+des+tanneurs+aix&lon=-0.542902&lat=47.468617&viewport_render_mode=features',
  );
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

test('overview still supports summary output for address-overview cards', async () => {
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
        },
      ],
    }));
  }, async (baseUrl) => {
    const result = await runCliAsync([
      'overview',
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
        'version=address-overview-v1',
        'cards=1',
        'Marché | Prix moyen | 5 200 €/m² | Transactions récentes',
      ].join('\n'),
    );
  });
});
