import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tempRoot = await mkdtemp(join(tmpdir(), 'onedex-npm-package-'));
const packDir = join(tempRoot, 'packs');
const installDir = join(tempRoot, 'install');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
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

  run('npm', ['--cache', join(tempRoot, 'npm-cache'), 'pack', '--pack-destination', packDir], {
    cwd: join(root, 'cli'),
  });

  const packedFiles = await readdir(packDir);
  const cliTarball = packedFiles.find((file) => file.startsWith('1dex-') && file.endsWith('.tgz'));

  if (!cliTarball) {
    throw new Error(`Missing packed npm tarballs: ${packedFiles.join(', ')}`);
  }

  await writeFile(join(installDir, 'package.json'), '{"type":"module"}\n');
  run('npm', [
    '--cache',
    join(tempRoot, 'npm-cache'),
    'install',
    '--ignore-scripts',
    join(packDir, cliTarball),
  ], { cwd: installDir });

  const help = run(join(installDir, 'node_modules/.bin/1dex'), ['--help'], { cwd: installDir });
  if (!help.stdout.includes('1dex map parcelles <address>')) {
    throw new Error(`Installed 1dex binary returned unexpected help:\n${help.stdout}`);
  }
  const shortHelp = run(join(installDir, 'node_modules/.bin/1dex'), ['-h'], { cwd: installDir });
  if (!shortHelp.stdout.includes('--format <json|csv|summary>')) {
    throw new Error(`Installed 1dex binary returned unexpected short help:\n${shortHelp.stdout}`);
  }
  const version = run(join(installDir, 'node_modules/.bin/1dex'), ['--version'], { cwd: installDir });
  if (!/^\d+\.\d+\.\d+/u.test(version.stdout.trim())) {
    throw new Error(`Installed 1dex binary returned unexpected version:\n${version.stdout}`);
  }
  const url = run(join(installDir, 'node_modules/.bin/1dex'), [
    'map',
    'parcelles',
    '--address',
    '50 rue des tanneurs aix',
    '--lon',
    '-0.542902',
    '--lat',
    '47.468617',
    '--url',
  ], { cwd: installDir });
  if (!url.stdout.includes('/explore/map-layer/parcelles?address=50+rue+des+tanneurs+aix')) {
    throw new Error(`Installed 1dex binary returned unexpected URL:\n${url.stdout}`);
  }

  console.log('npm console package check passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
