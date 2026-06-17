import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'dist/site');

async function copyIfPresent(from, to) {
  await cp(join(root, from), join(outDir, to), {
    recursive: true,
    force: true,
  });
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await copyIfPresent('site', '.');
await copyIfPresent('docs', 'docs');
await copyIfPresent('examples', 'examples');

await writeFile(
  join(outDir, 'README.txt'),
  [
    '1dex Connector public documentation build.',
    'Source: https://github.com/blipn/1dex-connector',
    'Product: https://1dex.fr/',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Built GitHub Pages site at ${outDir}`);
