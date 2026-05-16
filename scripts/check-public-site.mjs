import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const siteIndex = await readFile(join(root, 'dist/site/index.html'), 'utf8');

const requiredFragments = [
  '<title>1dex Connector',
  'name="description"',
  'rel="canonical"',
  'application/ld+json',
  'https://1dex.fr/',
  'https://github.com/blipn/1dex-connector',
  './openapi/1dex-public-api.yaml',
];

for (const fragment of requiredFragments) {
  if (!siteIndex.includes(fragment)) {
    throw new Error(`Missing public site fragment: ${fragment}`);
  }
}

const publicFiles = spawnSync(
  'find',
  ['README.md', 'docs', 'site', 'openapi', '-type', 'f'],
  {
    cwd: root,
    encoding: 'utf8',
  },
);

if (publicFiles.status !== 0) {
  throw new Error(publicFiles.stderr || 'Unable to list public files.');
}

const forbiddenPatterns = [
  /1dex-data-v2/i,
  /internal address api/i,
  /postgresql:\/\//i,
  /postgres:postgres/i,
  /GEOCODING_API_URL/i,
  /\/ops\b/i,
  /(^|[\s`"'/])\.env([\s`"'.:/]|$)/i,
];

for (const relativePath of publicFiles.stdout.split('\n').filter(Boolean)) {
  const content = await readFile(join(root, relativePath), 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error(`Forbidden public-doc marker ${pattern} found in ${relativePath}`);
    }
  }
}

console.log('Public site checks passed.');
