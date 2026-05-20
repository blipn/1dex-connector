import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const siteIndex = await readFile(join(root, 'dist/site/index.html'), 'utf8');
const apiPage = await readFile(join(root, 'dist/site/api.html'), 'utf8');
const requiredFragments = [
  '<title>1dex Connector - Clients API</title>',
  'name="description"',
  'rel="canonical"',
  'application/ld+json',
  './assets/favicon.svg',
  'https://1dex.fr/',
  'https://1dex.fr/developpeurs/api',
  'https://1dex.fr/api/v1/openapi.yaml',
  'https://github.com/blipn/1dex-connector',
  'https://1dex.fr/api/v1',
  '@1dex/connector',
  'npm install @1dex/connector',
  'curl -sS "https://1dex.fr/api/v1/address-overview?address=10%20rue%20des%20cordeliers%20aix&amp;dvf_radius_m=300"',
  'Les contrats API, l\'OpenAPI, les quotas et la documentation métier restent maintenus sur <code>1dex.fr</code>',
  'Clients API pour 1dex.',
  '<redoc spec-url="https://1dex.fr/api/v1/openapi.yaml"></redoc>',
  './api.html',
];

for (const fragment of requiredFragments) {
  if (!siteIndex.includes(fragment)) {
    throw new Error(`Missing public site fragment: ${fragment}`);
  }
}

const requiredApiFragments = [
  '<title>Tester l\'API publique - 1dex Connector</title>',
  'Console de test',
  'Documentation Redoc',
  'spec-url="https://1dex.fr/api/v1/openapi.yaml"',
  'id="api-explorer"',
  'Outil d’habilitation d’accès',
  './assets/favicon.svg',
];

for (const fragment of requiredApiFragments) {
  if (!apiPage.includes(fragment)) {
    throw new Error(`Missing API page fragment: ${fragment}`);
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
  /overflow-wrap:\s*anywhere/i,
  /1dex-data-v2/i,
  /https:\/\/api\.1dex\.fr/i,
  /(^|[^i])\/v1\//i,
  /your-1dex-api-host/i,
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
