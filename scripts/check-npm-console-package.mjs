import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tempRoot = await mkdtemp(join(tmpdir(), 'onedex-npm-package-'));
const packDir = join(tempRoot, 'packs');
const installDir = join(tempRoot, 'install');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: { ...process.env, ONEDEX_NO_UPDATE_CHECK: '1' },
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error([`${command} ${args.join(' ')} failed`, result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n'));
  }
  return result.stdout;
}

try {
  await mkdir(packDir);
  await mkdir(installDir);
  const packages = [];
  for (const directory of ['packages/js', 'cli']) {
    const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
    const packed = JSON.parse(run(npmCommand, [
      '--cache', join(tempRoot, 'npm-cache'), 'pack', '--json', '--pack-destination', packDir,
    ], { cwd: join(root, directory) }));
    assert.equal(packed.length, 1);
    assert.equal(packed[0].name, manifest.name);
    assert.equal(packed[0].version, manifest.version);
    for (const required of ['package.json', 'README.md', 'LICENSE']) {
      assert.ok(packed[0].files.some(({ path }) => path === required), `${manifest.name}: missing ${required}`);
    }
    packages.push({ manifest, tarball: join(packDir, packed[0].filename) });
  }
  const [sdk, cli] = packages;
  assert.equal(cli.manifest.dependencies[sdk.manifest.name], sdk.manifest.version, 'CLI must pin the tested SDK version.');
  await writeFile(join(installDir, 'package.json'), '{"type":"module"}\n');
  // Both local archives satisfy the exact dependency before this SDK version exists on npm.
  run(npmCommand, [
    '--cache', join(tempRoot, 'npm-cache'), 'install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund',
    ...packages.map(({ tarball }) => tarball),
  ], { cwd: installDir });
  for (const { manifest } of packages) {
    const installed = JSON.parse(await readFile(join(installDir, 'node_modules', manifest.name, 'package.json'), 'utf8'));
    assert.equal(installed.name, manifest.name);
    assert.equal(installed.version, manifest.version);
    assert.equal(installed.license, 'MIT');
  }
  const installedSdk = join(installDir, 'node_modules', sdk.manifest.name);
  assert.ok((await readFile(join(installedSdk, 'src/index.d.ts'), 'utf8')).includes('OneDexClient'));
  run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { OneDexClient, OneDexApiError } from '@1dex-fr/connector';
    const requests = [];
    const client = new OneDexClient({ fetch: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
    }});
    assert.equal(client.baseUrl, 'https://1dex.fr');
    assert.equal(OneDexApiError.name, 'OneDexApiError');
    await client.address.unlock({ address: '10 rue des Cordeliers Aix-en-Provence', idempotencyKey: 'package-unlock' });
    await client.address.detailsUrl('/api/v1/address-details?normalized_address_key=addr_test&fields=summary', { idempotencyKey: 'package-details' });
    assert.equal(requests[0].options.method, 'POST');
    assert.equal(new Headers(requests[0].options.headers).get('Idempotency-Key'), 'package-unlock');
    assert.equal(new URL(requests[0].url).pathname, '/api/v1/address-unlocks');
    assert.equal(new Headers(requests[1].options.headers).get('Idempotency-Key'), 'package-details');
    assert.equal(new URL(requests[1].url).pathname, '/api/v1/address-details');
  `], { cwd: installDir });

  const installedCli = join(installDir, 'node_modules', cli.manifest.name, 'src/cli.js');
  const executeCli = (args) => run(process.execPath, [installedCli, ...args], { cwd: installDir });
  assert.equal(executeCli(['--version']).trim(), cli.manifest.version);
  const help = executeCli(['--help']);
  assert.equal(executeCli(['-h']), help);
  for (const fragment of ['1dex overview', '1dex autocomplete', '1dex score address', '1dex account usage', '1dex address unlock', '1dex address details', '--idempotency-key', '--max-attempts', '--format']) {
    assert.ok(help.includes(fragment), `Installed CLI help is missing ${fragment}.`);
  }
  assert.ok(executeCli(['examples']).includes('1dex'));
  const commands = [
    [['overview', '--address', '10 rue des cordeliers aix', '--dvf-radius-m', '300'], '/api/v1/address-overview'],
    [['autocomplete', '10 rue des cordeliers aix'], '/api/v1/autocomplete/address'],
    [['score', 'address', '10 rue des cordeliers aix'], '/api/v1/score/address'],
    [['dvf', '--address', '50 rue des tanneurs aix', '--lon', '-0.542902', '--lat', '47.468617'], '/api/v1/map-layer/parcelles_dvf'],
    [['address', 'unlock', '10 rue des cordeliers aix', '--idempotency-key', 'package-unlock'], '/api/v1/address-unlocks'],
    [['address', 'details', '--details-url', '/api/v1/address-details?normalized_address_key=addr_123&fields=summary', '--idempotency-key', 'package-details'], '/api/v1/address-details'],
    [['account', 'usage'], '/api/v1/account/usage'],
  ];
  for (const [args, pathname] of commands) {
    const url = new URL(executeCli([...args, '--url']).trim());
    assert.equal(url.origin, 'https://1dex.fr');
    assert.equal(url.pathname, pathname);
    assert.equal(url.searchParams.has('idempotency_key'), false);
  }
  console.log(`npm package check passed: ${packages.map(({ manifest }) => `${manifest.name}@${manifest.version}`).join(', ')} (local archives, offline install).`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
