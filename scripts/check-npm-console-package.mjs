import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    stdio: options.stdio ?? 'pipe',
  });

  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }

  return result;
}

try {
  await mkdir(packDir, { recursive: true });
  await mkdir(installDir, { recursive: true });

  run(npmCommand, ['--cache', join(tempRoot, 'npm-cache'), 'pack', '--pack-destination', packDir], {
    cwd: join(root, 'cli'),
  });

  const packedFiles = await readdir(packDir);
  const cliTarball = packedFiles.find((file) => file.startsWith('1dex-') && file.endsWith('.tgz'));

  if (!cliTarball) {
    throw new Error(`Missing packed npm tarballs: ${packedFiles.join(', ')}`);
  }

  await writeFile(join(installDir, 'package.json'), '{"type":"module"}\n');
  run(npmCommand, [
    '--cache',
    join(tempRoot, 'npm-cache'),
    'install',
    '--ignore-scripts',
    join(packDir, cliTarball),
  ], { cwd: installDir });

  const installedCli = join(installDir, 'node_modules/@1dex-fr/1dex/src/cli.js');
  const installedSource = await readFile(installedCli, 'utf8');
  if (!installedSource.includes('1dex overview <address|--city-code|--lon/--lat|--parcel-record-key>') || !installedSource.includes('1dex autocomplete <query>') || !installedSource.includes('1dex score address <address>') || !installedSource.includes('1dex parcelles <address>')) {
    throw new Error('Installed 1dex binary is missing the expected help commands.');
  }
  if (!installedSource.includes('--format <json|csv|summary>')) {
    throw new Error('Installed 1dex binary is missing the expected format option.');
  }
  if (!installedSource.includes('/api/v1/map-layer/')) {
    throw new Error('Installed 1dex binary is missing the expected map-layer URL builder.');
  }
  if (!installedSource.includes('/api/v1/address-overview')) {
    throw new Error('Installed 1dex binary is missing the expected address overview URL builder.');
  }
  run(process.execPath, [installedCli, '--help'], { cwd: installDir });
  run(process.execPath, [installedCli, '-h'], { cwd: installDir });
  run(process.execPath, [installedCli, '--version'], { cwd: installDir });
  run(process.execPath, [installedCli, 'examples'], { cwd: installDir });
  run(process.execPath, [installedCli,
    'overview',
    '--address',
    '10 rue des cordeliers aix',
    '--dvf-radius-m',
    '300',
    '--url',
  ], { cwd: installDir });
  run(process.execPath, [installedCli,
    'autocomplete',
    '10 rue des cordeliers aix',
    '--url',
  ], { cwd: installDir });
  run(process.execPath, [installedCli,
    'score',
    'address',
    '10 rue des cordeliers aix',
    '--url',
  ], { cwd: installDir });
  run(process.execPath, [installedCli,
    'dvf',
    '--address',
    '50 rue des tanneurs aix',
    '--lon',
    '-0.542902',
    '--lat',
    '47.468617',
    '--url',
  ], { cwd: installDir });

  console.log('npm console package check passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
