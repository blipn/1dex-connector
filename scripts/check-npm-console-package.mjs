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
    cwd: join(root, 'packages/js'),
  });
  run('npm', ['--cache', join(tempRoot, 'npm-cache'), 'pack', '--pack-destination', packDir], {
    cwd: join(root, 'cli'),
  });

  const packedFiles = await readdir(packDir);
  const connectorTarball = packedFiles.find((file) => file.startsWith('1dex-connector-') && file.endsWith('.tgz'));
  const cliTarball = packedFiles.find((file) => file.startsWith('1dex-') && !file.startsWith('1dex-connector-') && file.endsWith('.tgz'));

  if (!connectorTarball || !cliTarball) {
    throw new Error(`Missing packed npm tarballs: ${packedFiles.join(', ')}`);
  }

  await writeFile(join(installDir, 'package.json'), '{"type":"module"}\n');
  run('npm', [
    '--cache',
    join(tempRoot, 'npm-cache'),
    'install',
    '--ignore-scripts',
    join(packDir, connectorTarball),
    join(packDir, cliTarball),
  ], { cwd: installDir });

  const help = run(join(installDir, 'node_modules/.bin/1dex'), ['--help'], { cwd: installDir });
  if (!help.stdout.includes('1dex map parcelles <address>')) {
    throw new Error(`Installed 1dex binary returned unexpected help:\n${help.stdout}`);
  }

  console.log('npm console package check passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
