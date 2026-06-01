import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const response = await fetch('https://1dex.fr/api/v1/openapi.yaml');
if (!response.ok) {
  throw new Error(`Unable to fetch live OpenAPI: HTTP ${response.status}`);
}
const specText = await response.text();

const requiredPaths = [
  '/address-overview',
  '/autocomplete/address',
  '/address-pages/{slug}/state',
  '/map-layer/{layer_key}',
  '/map-viewport',
  '/score/address',
  '/score/compare',
  '/score/grid',
  '/score/address-suggest',
];

for (const path of requiredPaths) {
  if (!specText.includes(path)) {
    throw new Error(`Live OpenAPI is missing expected public path: ${path}`);
  }
}

const sourceFiles = [
  'packages/js/src/index.js',
  'packages/js/src/index.d.ts',
  'packages/python/src/onedex/client.py',
  'cli/src/cli.js',
  'site/assets/app.js',
  'site/api.html',
  'docs/quickstart.md',
  'docs/examples.md',
];
const corpus = (await Promise.all(sourceFiles.map(async (file) => readFile(join(root, file), 'utf8')))).join('\n');
const connectorFragments = [
  '/api/v1/address-overview',
  '/api/v1/autocomplete/address',
  '/api/v1/address-pages/',
  '/api/v1/map-layer/',
  '/api/v1/map-viewport',
  '/api/v1/score/address',
  '/api/v1/score/compare',
  '/api/v1/score/grid',
  '/api/v1/score/address-suggest',
  'city_code',
  'parcel_record_key',
  'dvf_year',
];

for (const fragment of connectorFragments) {
  if (!corpus.includes(fragment)) {
    throw new Error(`Connector/docs corpus is missing live OpenAPI fragment: ${fragment}`);
  }
}

console.log('Live OpenAPI parity checks passed.');
