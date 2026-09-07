import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const packageDir = join(root, 'packages/python');
const tempRoot = await mkdtemp(join(tmpdir(), 'onedex-python-package-'));
const wheelDir = join(tempRoot, 'distributions');
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
    const result = spawnSync(command, [
      ...prefixArgs,
      '-c',
      'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)',
    ], {
      encoding: 'utf8',
      shell: process.platform === 'win32' && command === 'py',
      stdio: 'pipe',
    });
    if (result.status === 0) {
      return { command, prefixArgs };
    }
    attempts.push(`${command} ${prefixArgs.join(' ')} (Python 3.10+)`);
  }

  throw new Error(`Unable to find Python 3.10+. Tried: ${attempts.join(', ')}`);
}

const python = findPython();
const runPython = (args, options = {}) => run(python.command, [...python.prefixArgs, ...args], options);
const hasPip = spawnSync(python.command, [...python.prefixArgs, '-m', 'pip', '--version'], {
  encoding: 'utf8',
  stdio: 'pipe',
}).status === 0;

const pyprojectText = await readFile(join(packageDir, 'pyproject.toml'), 'utf8');
const projectSection = pyprojectText.split(/^\[project\]\s*$/mu)[1]?.split(/^\[/mu)[0];
const project = {
  name: projectSection?.match(/^name\s*=\s*"([^"]+)"\s*$/mu)?.[1],
  version: projectSection?.match(/^version\s*=\s*"([^"]+)"\s*$/mu)?.[1],
};
if (!project.name || !project.version) {
  throw new Error('Unable to read project name and version from packages/python/pyproject.toml.');
}

try {
  await mkdir(wheelDir, { recursive: true });
  await mkdir(installDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });

  if (hasPip) {
    const buildToolsDir = join(tempRoot, 'build-tools');
    runPython(['-m', 'pip', 'install', '--target', buildToolsDir, '--cache-dir', cacheDir, 'build']);
    // The default build creates the wheel from the sdist, testing both shipped artifacts.
    runPython(['-m', 'build', '--outdir', wheelDir, packageDir], {
      env: { ...process.env, PYTHONPATH: buildToolsDir },
    });
  } else {
    run('uv', ['run', '--no-project', '--with', 'build', 'python', '-m', 'build', '--outdir', wheelDir, packageDir]);
  }

  const wheels = await readdir(wheelDir);
  const wheel = wheels.find((file) => file.startsWith('1dex_connector-') && file.includes(`-${project.version}-`) && file.endsWith('.whl'));
  if (!wheel) {
    throw new Error(`Missing built 1dex connector wheel: ${wheels.join(', ')}`);
  }
  const wheelPath = join(wheelDir, wheel);
  const sdist = wheels.find((file) => file === `1dex_connector-${project.version}.tar.gz`);
  if (!sdist || wheels.length !== 2) {
    throw new Error(`Expected exactly a source distribution and wheel: ${wheels.join(', ')}`);
  }

  if (hasPip) {
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
  } else {
    runPython([
      '-c',
      'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',
      wheelPath,
      installDir,
    ]);
  }

  runPython([
    '-c',
    [
      'from onedex import OneDexClient, OneDexApiError',
      'from importlib.metadata import version',
      'import pathlib, sys, onedex',
      'assert pathlib.Path(onedex.__file__).resolve().is_relative_to(pathlib.Path(sys.argv[1]).resolve())',
      'assert version(sys.argv[2]) == sys.argv[3]',
      'client = OneDexClient()',
      'assert client.base_url == "https://1dex.fr"',
      'assert OneDexApiError.__name__ == "OneDexApiError"',
    ].join('; '),
    installDir,
    project.name,
    project.version,
  ], {
    cwd: installDir,
    env: { ...process.env, PYTHONPATH: installDir },
  });

  runPython([
    '-c',
    [
      'import pathlib, sys, zipfile, tarfile, email',
      'wheel = pathlib.Path(sys.argv[1])',
      'archive = zipfile.ZipFile(wheel)',
      'metadata_name = next(name for name in archive.namelist() if name.endswith("/METADATA"))',
      'metadata = email.message_from_bytes(archive.read(metadata_name))',
      'assert metadata["Name"] == sys.argv[2]',
      'assert metadata["Version"] == sys.argv[3]',
      'assert metadata["Requires-Python"] == ">=3.10"',
      'assert metadata["License-Expression"] == "MIT"',
      'assert metadata["License-File"] == "LICENSE"',
      'assert metadata["Description-Content-Type"] == "text/markdown"',
      'assert metadata.get_payload().strip()',
      'assert any(name.endswith("/LICENSE") and "dist-info/licenses" in name for name in archive.namelist())',
      'source = tarfile.open(sys.argv[4], "r:gz")',
      'prefix = f"1dex_connector-{sys.argv[3]}/"',
      'assert all(prefix + name in source.getnames() for name in ["pyproject.toml", "README.md", "LICENSE", "src/onedex/__init__.py", "src/onedex/client.py"])',
      'source_metadata = email.message_from_bytes(source.extractfile(prefix + "PKG-INFO").read())',
      'assert all(source_metadata[key] == metadata[key] for key in ["Name", "Version", "Requires-Python", "License-Expression", "License-File"])',
    ].join('; '),
    wheelPath,
    project.name,
    project.version,
    join(wheelDir, sdist),
  ]);

  console.log(`Python package check passed: ${project.name} ${project.version} (sdist, wheel, isolated installed import).`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
