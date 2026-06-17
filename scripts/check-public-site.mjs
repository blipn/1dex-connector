import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const siteIndex = await readFile(join(root, 'dist/site/index.html'), 'utf8');
const apiPage = await readFile(join(root, 'dist/site/api.html'), 'utf8');
const documentationApiPage = await readFile(join(root, 'dist/site/documentation-api.html'), 'utf8');
const quickstartPage = await readFile(join(root, 'dist/site/quickstart.html'), 'utf8');
const appJs = await readFile(join(root, 'dist/site/assets/app.js'), 'utf8');
const sitemap = await readFile(join(root, 'dist/site/sitemap.xml'), 'utf8');
const requiredFragments = [
  '<title>1dex Connector - Clients API</title>',
  'name="description"',
  'rel="canonical"',
  'application/ld+json',
  './assets/favicon.svg',
  'https://1dex.fr/',
  'https://1dex.fr/developpeurs/api',
  'https://1dex.fr/api/v1/openapi.yaml',
  'https://1dex.fr/api/v1/docs',
  'https://github.com/blipn/1dex-connector',
  'https://1dex.fr/api/v1',
  '@1dex-fr/connector',
  'npm i @1dex-fr/connector',
  'python -m pip install 1dex-connector',
  'npm i -g @1dex-fr/1dex',
  '1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300',
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
  '<option value="address-details">Détails adresse</option>',
  '<option value="account-usage">Usage compte</option>',
  '<option value="map-viewport">Viewport multi-calques</option>',
  '<option value="map-focus-public-location">Focus coordonnées</option>',
  'name="normalized_address_key"',
  'name="unlock_request"',
  'name="parcel_record_key"',
  'name="dvf_year"',
  'id="api-doc-link"',
  'id="api-explorer"',
  'Accès aux clés API',
  'https://1dex.fr/api/v1/docs',
  'https://1dex.fr/developpeurs/api#donnees',
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
  'https://1dex.fr/api/v1/address-details?address=10%20rue%20des%20cordeliers%20aix&amp;fields=summary,rail',
  'https://1dex.fr/api/v1/communes/search?q=aix&amp;limit=5',
  'npm i @1dex-fr/connector',
  'import { OneDexClient } from "@1dex-fr/connector";',
  'python -m pip install 1dex-connector',
  'from onedex import OneDexClient',
  'api_professional_required',
  'insufficient_credits',
  'unlock_request',
  'details_url',
  'client.account.usage()',
  'usage.credits.total_remaining',
  'usage["credits"]["total_remaining"]',
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
  'getAddressDetails: \'./api.html?operation=address-details&fields=summary,rail\'',
  'getMapViewport: \'./api.html?operation=map-viewport&layers=context,iris\'',
  'focusPublicLocation: \'./api.html?operation=map-focus-public-location&lon=5.446766&lat=43.529667\'',
  'operation === \'address-page-state\'',
  'operation === \'address-details\'',
  'operation === \'address-unlock\'',
  'operation === \'map-viewport\'',
  'Adresse, code commune ou coordonnées requis.',
  'parcel_record_key',
  'const unlockRequest = readValue(\'unlock_request\')',
  'JSON.parse(unlockRequest)',
  'dvf_year',
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

if (siteIndex.includes('redoc@next') || apiPage.includes('redoc@next') || documentationApiPage.includes('redoc@next')) {
  throw new Error('Public site should pin a stable Redoc bundle, not redoc@next.');
}

for (const page of [siteIndex, apiPage, documentationApiPage, quickstartPage]) {
  const canonical = page.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  if (canonical && !sitemap.includes(`<loc>${canonical}</loc>`)) {
    throw new Error(`Canonical URL is missing from sitemap: ${canonical}`);
  }
}

const publishedOpenApi = await readFile(join(root, 'dist/site/openapi/1dex-public-api.yaml'), 'utf8').catch((error) => {
  if (error?.code === 'ENOENT') {
    return null;
  }
  throw error;
});
if (publishedOpenApi && /paths:\s*\{\}/u.test(publishedOpenApi)) {
  throw new Error('Public site must not publish an empty OpenAPI YAML; link to the live 1dex OpenAPI instead.');
}

async function listPublicFiles(entries) {
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(root, entry);
    const stats = await readdir(absolutePath, { withFileTypes: true }).catch(() => null);
    if (!stats) {
      files.push(entry);
      continue;
    }
    for (const stat of stats) {
      const relativePath = join(entry, stat.name);
      if (stat.isDirectory()) {
        files.push(...await listPublicFiles([relativePath]));
      } else if (stat.isFile()) {
        files.push(relativePath);
      }
    }
  }
  return files;
}

const publicFiles = await listPublicFiles(['dist/site']);

const forbiddenPatterns = [
  /overflow-wrap:\s*anywhere/i,
  /1dex-data-v2/i,
  /https:\/\/api\.1dex\.fr/i,
  /(^|[^i])\/v1\//i,
  /your-1dex-api-host/i,
  /developpeurs\/api\/technique/i,
  /developpeurs\/api\/metier/i,
  /internal address api/i,
  /postgresql:\/\//i,
  /postgres:postgres/i,
  /GEOCODING_API_URL/i,
  /\/ops\b/i,
  /(^|[\s`"'/])\.env([\s`"'.:/]|$)/i,
];

for (const relativePath of publicFiles) {
  const content = await readFile(join(root, relativePath), 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error(`Forbidden public-doc marker ${pattern} found in ${relativePath}`);
    }
  }
}

console.log('Public site checks passed.');
