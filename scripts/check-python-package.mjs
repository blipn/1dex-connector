import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const packageDir = join(root, 'packages/python');
const tempRoot = await mkdtemp(join(tmpdir(), 'onedex-python-package-'));
const wheelDir = join(tempRoot, 'wheels');
const installDir = join(tempRoot, 'install');
const cacheDir = join(tempRoot, 'pip-cache');

const candidates = process.platform === 'win32'
  ? [
      ['python', []],
      ['py', ['-3']],
      ['python3', []],
    ]
  : [
      ['python3', []],
      ['python', []],
    ];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: options.env ?? process.env,
    shell: process.platform === 'win32' && command === 'py',
    stdio: options.stdio ?? 'pipe',
  });

  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed`,
      result.stdout,
      result.stderr,
      result.error?.message,
    ].filter(Boolean).join('\n'));
  }

  return result;
}

function findPython() {
  const attempts = [];
  for (const [command, prefixArgs] of candidates) {
    const result = spawnSync(command, [...prefixArgs, '-c', 'import tomllib'], {
      encoding: 'utf8',
      shell: process.platform === 'win32' && command === 'py',
      stdio: 'pipe',
    });
    if (result.status === 0) {
      return { command, prefixArgs };
    }
    attempts.push(`${command} ${prefixArgs.join(' ')} -c "import tomllib"`);
  }

  throw new Error(`Unable to find Python 3.11+ with tomllib. Tried: ${attempts.join(', ')}`);
}

const python = findPython();
const runPython = (args, options = {}) => run(python.command, [...python.prefixArgs, ...args], options);

try {
  await mkdir(wheelDir, { recursive: true });
  await mkdir(installDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });

  const project = JSON.parse(runPython([
    '-c',
    [
      'import json, tomllib',
      'data = tomllib.load(open("pyproject.toml", "rb"))["project"]',
      'print(json.dumps({"name": data["name"], "version": data["version"]}))',
    ].join('; '),
  ], { cwd: packageDir }).stdout);

  runPython([
    '-m',
    'pip',
    'wheel',
    '.',
    '--no-deps',
    '-w',
    wheelDir,
    '--cache-dir',
    cacheDir,
  ], { cwd: packageDir });

  const wheels = await readdir(wheelDir);
  const wheel = wheels.find((file) => file.startsWith('1dex_connector-') && file.includes(`-${project.version}-`) && file.endsWith('.whl'));
  if (!wheel) {
    throw new Error(`Missing built 1dex connector wheel: ${wheels.join(', ')}`);
  }
  const wheelPath = join(wheelDir, wheel);

  runPython([
    '-m',
    'pip',
    'install',
    '--no-deps',
    '--target',
    installDir,
    wheelPath,
    '--cache-dir',
    cacheDir,
  ]);

  const pythonPath = process.env.PYTHONPATH
    ? `${installDir}${process.platform === 'win32' ? ';' : ':'}${process.env.PYTHONPATH}`
    : installDir;

  runPython([
    '-c',
    [
      'from onedex import OneDexClient, OneDexApiError',
      'client = OneDexClient()',
      'assert client.base_url == "https://1dex.fr"',
      'assert OneDexApiError.__name__ == "OneDexApiError"',
    ].join('; '),
  ], {
    env: { ...process.env, PYTHONPATH: pythonPath },
  });

  runPython([
    '-c',
    [
      'import pathlib, sys, zipfile',
      'wheel = pathlib.Path(sys.argv[1])',
      'archive = zipfile.ZipFile(wheel)',
      'metadata_name = next(name for name in archive.namelist() if name.endswith("/METADATA"))',
      'metadata = archive.read(metadata_name).decode()',
      'assert f"Name: {sys.argv[2]}" in metadata',
      'assert f"Version: {sys.argv[3]}" in metadata',
      'assert "public and professional 1dex API surface" in metadata',
      'assert "Auth, purchase, and detailed reads" in metadata',
      'assert "insufficient_credits" in metadata',
      'assert any(name.endswith("/LICENSE") and "dist-info/licenses" in name for name in archive.namelist())',
    ].join('; '),
    wheelPath,
    project.name,
    project.version,
  ]);

  console.log('Python package check passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
