import { spawnSync } from 'node:child_process';

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

const testArgs = ['-m', 'unittest', 'discover', '-s', 'packages/python/tests'];
const attempts = [];

for (const [command, prefixArgs] of candidates) {
  const result = spawnSync(command, [...prefixArgs, ...testArgs], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32' && command === 'py',
  });

  if (result.status === 0) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    process.exit(0);
  }

  attempts.push([
    `${command} ${[...prefixArgs, ...testArgs].join(' ')}`,
    result.stdout,
    result.stderr,
    result.error?.message,
  ].filter(Boolean).join('\n'));
}

throw new Error([
  'Unable to run Python tests with any supported Python command.',
  ...attempts,
].join('\n\n'));
