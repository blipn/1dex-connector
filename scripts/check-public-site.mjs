import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const siteIndex = await readFile(join(root, 'dist/site/index.html'), 'utf8');
const apiPage = await readFile(join(root, 'dist/site/api.html'), 'utf8');
const documentationApiPage = await readFile(join(root, 'dist/site/documentation-api.html'), 'utf8');
const quickstartPage = await readFile(join(root, 'dist/site/quickstart.html'), 'utf8');
const appJs = await readFile(join(root, 'dist/site/assets/app.js'), 'utf8');
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
  'npm i -g @1dex-fr/1dex',
  '1dex "10 rue des cordeliers aix"',
  'curl -sS "https://1dex.fr/api/v1/address-overview?address=10%20rue%20des%20cordeliers%20aix&amp;dvf_radius_m=600"',
  'Les contrats API, l\'OpenAPI, les quotas et la documentation métier restent maintenus sur <code>1dex.fr</code>',
  'Clients API pour 1dex.',
  './api.html',
  './documentation-api.html',
  './quickstart.html',
];

for (const fragment of requiredFragments) {
  if (!siteIndex.includes(fragment)) {
    throw new Error(`Missing public site fragment: ${fragment}`);
  }
}

const requiredApiFragments = [
  '<title>Tester l\'API publique - 1dex Connector</title>',
  'Console de test',
  'Documentation API',
  '<option value="address-page-state">État page adresse</option>',
  '<option value="map-viewport">Viewport multi-calques</option>',
  'id="api-doc-link"',
  'id="api-explorer"',
  'Outil d’habilitation d’accès',
  './assets/favicon.svg',
];

for (const fragment of requiredApiFragments) {
  if (!apiPage.includes(fragment)) {
    throw new Error(`Missing API page fragment: ${fragment}`);
  }
}

const requiredQuickstartFragments = [
  '<title>Démarrage connecteur - 1dex Connector</title>',
  'https://blipn.github.io/1dex-connector/quickstart.html',
  'https://github.com/blipn/1dex-connector/blob/main/docs/quickstart.md',
  'curl "https://1dex.fr/api/v1/address-overview?address=10%20rue%20des%20cordeliers%20aix&amp;dvf_radius_m=600"',
  'import { OneDexClient } from "@1dex/connector";',
  'from onedex import OneDexClient',
  './api.html',
  './documentation-api.html',
];

for (const fragment of requiredQuickstartFragments) {
  if (!quickstartPage.includes(fragment)) {
    throw new Error(`Missing quickstart page fragment: ${fragment}`);
  }
}

const requiredDocumentationApiFragments = [
  '<title>Documentation API - 1dex Connector</title>',
  'Référence interactive des points d\'entrée 1dex',
  'href="./api.html?operation=map-layer&amp;layer=parcelles"',
  'href="./api.html?operation=map-viewport&amp;layers=context,iris"',
  'id="redoc-container" data-spec-url="https://1dex.fr/api/v1/openapi.yaml"',
  'https://cdn.jsdelivr.net/npm/redoc@2.5.2/bundles/redoc.standalone.js',
  '#operation/getMapLayer',
  './api.html',
];

for (const fragment of requiredDocumentationApiFragments) {
  if (!documentationApiPage.includes(fragment)) {
    throw new Error(`Missing documentation API page fragment: ${fragment}`);
  }
}

const requiredAppFragments = [
  'scheduleHashScroll',
  'readClickedTargetId',
  '[data-item-id], [role="menuitem"]',
  'window.Redoc.init',
  'hideHostname: true',
  'operationConsoleLinks',
  'addOperationTestLinks',
  'getMapViewport: \'./api.html?operation=map-viewport&layers=context,iris\'',
  'operation === \'address-page-state\'',
  'operation === \'map-viewport\'',
  'pageParams.get(\'operation\')',
  'window.addEventListener(\'hashchange\', scheduleHashScroll)',
  'document.querySelector(`[data-section-id="${CSS.escape(decodedId)}"]`)',
  'window.location.hash.startsWith(\'#operation/\')',
];

for (const fragment of requiredAppFragments) {
  if (!appJs.includes(fragment)) {
    throw new Error(`Missing app script fragment: ${fragment}`);
  }
}

if (siteIndex.includes('./docs/quickstart.md')) {
  throw new Error('Public site should link to quickstart.html or GitHub, not raw Pages Markdown.');
}

if (apiPage.includes('public-preview') || quickstartPage.includes('public-preview') || documentationApiPage.includes('public-preview')) {
  throw new Error('Connector public pages should expose address overview, not the legacy public-preview endpoint.');
}

if (siteIndex.includes('redoc@next') || apiPage.includes('redoc@next') || documentationApiPage.includes('redoc@next')) {
  throw new Error('Public site should pin a stable Redoc bundle, not redoc@next.');
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
