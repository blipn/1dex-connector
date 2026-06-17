#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const DEFAULT_BASE_URL = 'https://1dex.fr';
const DEFAULT_SAMPLE_ADDRESS = '10 rue des cordeliers aix';
const NPM_LATEST_URL = 'https://registry.npmjs.org/@1dex-fr%2f1dex/latest';
const PUBLIC_MAP_LAYERS = new Set([
  'context',
  'iris',
  'parcelles',
  'parcelles_dvf',
  'parcelles_travaux',
  'parcelles_labels',
]);
const PUBLIC_MAP_LAYER_ALIASES = Object.freeze({
  dvf: 'parcelles_dvf',
  travaux: 'parcelles_travaux',
  labels: 'parcelles_labels',
});
const SUPPORTED_FORMATS = new Set(['json', 'csv', 'summary']);
const FLAG_ALIASES = Object.freeze({
  a: 'address',
  b: 'viewport-bbox',
  d: 'dvf-radius-m',
  f: 'format',
  h: 'help',
  l: 'layer',
  r: 'viewport-render-mode',
  u: 'url',
  V: 'version',
  z: 'viewport-zoom',
});
const VALUE_FLAGS = new Set([
  'address',
  'api-key',
  'base-url',
  'bbox',
  'category',
  'city-code',
  'dvf-radius-m',
  'dvf-year',
  'feature-key',
  'fields',
  'format',
  'input',
  'layer',
  'layer-key',
  'lat',
  'layers',
  'limit',
  'lon',
  'normalized-address-key',
  'parcel-record-key',
  'path',
  'profile',
  'record-key',
  'record-keys',
  'slug',
  'sort-by',
  'timeout-ms',
  'viewport-bbox',
  'viewport-render-mode',
  'viewport-zoom',
  'zoom',
]);
const BOOLEAN_FLAGS = new Set([
  'help',
  'url',
  'version',
]);

class OneDexApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'OneDexApiError';
    this.status = options.status ?? 0;
    this.body = options.body;
    this.requestId = options.requestId ?? null;
  }
}

function normalizeBaseUrl(baseUrl) {
  const value = (baseUrl ?? DEFAULT_BASE_URL).trim();
  if (!value) {
    throw new TypeError('baseUrl must not be empty.');
  }
  return value.replace(/\/+$/, '');
}

function appendQuery(path, query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function hasCoordinates(input) {
  return input.lon !== undefined && input.lon !== null && input.lat !== undefined && input.lat !== null;
}

function hasAddressLocator(input) {
  return Boolean(
    (typeof input.address === 'string' && input.address.trim())
    || (typeof input.normalized_address_key === 'string' && input.normalized_address_key.trim())
    || (typeof input.parcel_record_key === 'string' && input.parcel_record_key.trim())
    || hasCoordinates(input),
  );
}

function hasNormalizedAddressKey(input) {
  return typeof input.normalized_address_key === 'string' && input.normalized_address_key.trim();
}

function hasResolvedAddressLocator(input) {
  return Boolean(
    (typeof input.address === 'string' && input.address.trim())
    || (typeof input.parcel_record_key === 'string' && input.parcel_record_key.trim())
    || hasCoordinates(input),
  );
}

function assertNormalizedAddressKeyIsAlone(input, name) {
  if (hasNormalizedAddressKey(input) && (hasResolvedAddressLocator(input) || input.city_code)) {
    throw new Error(`${name} must use normalized_address_key alone, without address, city_code, parcel_record_key, or lon/lat.`);
  }
}

function normalizeCsvList(value, name) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    if (items.length === 0) {
      throw new Error(`${name} must not be empty.`);
    }
    return items.join(',');
  }
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(`${name} must not be empty.`);
  }
  return text;
}

function normalizeAddressLocator(input) {
  const {
    cityCode,
    city_code: cityCodeSnake,
    normalizedAddressKey,
    normalized_address_key: normalizedAddressKeySnake,
    parcelRecordKey,
    parcel_record_key: parcelRecordKeySnake,
    ...query
  } = input;
  return {
    ...query,
    city_code: cityCodeSnake ?? cityCode,
    normalized_address_key: normalizedAddressKeySnake ?? normalizedAddressKey,
    parcel_record_key: parcelRecordKeySnake ?? parcelRecordKey,
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new OneDexApiError('1dex API returned invalid JSON.', {
      status: response.status,
      body: text,
      requestId: response.headers.get('x-request-id'),
    });
  }
}

class OneDexClient {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetch = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.defaultHeaders = {};
    if (options.apiKey) {
      this.defaultHeaders.authorization = `Bearer ${options.apiKey}`;
    }

    if (typeof this.fetch !== 'function') {
      throw new TypeError('A fetch implementation is required.');
    }

    this.autocomplete = Object.freeze({
      address: (input) => this.autocompleteAddress(input),
    });
    this.addressPages = Object.freeze({
      state: (slug) => this.addressPageState(slug),
    });
    this.address = Object.freeze({
      details: (input) => this.addressDetails(input),
      unlock: (input) => this.addressUnlock(input),
    });
    this.account = Object.freeze({
      usage: () => this.accountUsage(),
    });
    this.communes = Object.freeze({
      search: (input) => this.communeSearch(input),
    });
    this.map = Object.freeze({
      parcelles: (input) => this.mapParcelles(input),
      dvf: (input) => this.mapLayer({ ...input, layer: 'parcelles_dvf' }),
      travaux: (input) => this.mapLayer({ ...input, layer: 'parcelles_travaux' }),
      iris: (input) => this.mapLayer({ ...input, layer: 'iris' }),
      context: (input) => this.mapLayer({ ...input, layer: 'context' }),
      labels: (input) => this.mapLayer({ ...input, layer: 'parcelles_labels' }),
      layer: (input) => this.mapLayer(input),
      viewport: (input) => this.mapViewport(input),
      focus: Object.freeze({
        parcelle: (input) => this.mapFocusParcelle(input),
        parcelles: (input) => this.mapFocusParcelles(input),
        address: (input) => this.mapFocusAddress(input),
        publicLocation: (input) => this.mapFocusPublicLocation(input),
        feature: (input) => this.mapFocusFeature(input),
      }),
    });
    this.overview = Object.freeze({
      address: (input) => this.addressOverview(input),
    });
    this.preview = Object.freeze({
      byPath: (input) => this.publicPreview(input),
    });
    this.score = Object.freeze({
      address: (input) => this.scoreAddress(input),
      compare: (input) => this.scoreCompare(input),
      grid: (input) => this.scoreGrid(input),
      addressSuggest: (input) => this.scoreAddressSuggest(input),
    });
  }

  async request(method, path, options = {}) {
    const controller = new AbortController();
    const timer = this.timeoutMs > 0
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : undefined;

    const headers = { accept: 'application/json', ...this.defaultHeaders };
    let body;
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new OneDexApiError('1dex API request timed out.', { status: 0 });
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new OneDexApiError(`Unable to reach 1dex API: ${message}`, { status: 0 });
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }

    const bodyValue = await readJsonResponse(response);
    if (!response.ok) {
      const warning = Array.isArray(bodyValue?.warnings) ? bodyValue.warnings[0] : undefined;
      const warningMessage = warning?.message;
      throw new OneDexApiError(warningMessage ?? `1dex API returned ${response.status}.`, {
        status: response.status,
        body: bodyValue,
        requestId: bodyValue?.request_id ?? response.headers.get('x-request-id'),
      });
    }
    return bodyValue;
  }

  mapParcelles(input) {
    return this.mapLayer({ ...input, layer: 'parcelles' });
  }

  mapLayer(input) {
    const { address, city_code: cityCode, lon, lat, layer = 'parcelles', ...query } = input;
    if ((typeof address !== 'string' || !address.trim()) && (lon === undefined || lat === undefined) && (typeof cityCode !== 'string' || !cityCode.trim())) {
      throw new TypeError('map layer input requires address, city_code, or lon/lat.');
    }
    const layerKey = normalizeMapLayer(layer);
    const path = appendQuery(`/api/v1/map-layer/${encodeURIComponent(layerKey)}`, {
      address: typeof address === 'string' && address.trim() ? address.trim() : undefined,
      city_code: typeof cityCode === 'string' && cityCode.trim() ? cityCode.trim() : undefined,
      lon,
      lat,
      ...query,
    });
    return this.request('GET', path);
  }

  mapViewport(input) {
    const { address, city_code: cityCode, lon, lat, layers, ...query } = input;
    if (typeof layers !== 'string' || !layers.trim()) {
      throw new TypeError('map viewport input requires layers.');
    }
    if ((typeof address !== 'string' || !address.trim()) && (lon === undefined || lat === undefined) && (typeof cityCode !== 'string' || !cityCode.trim())) {
      throw new TypeError('map viewport input requires address, city_code, or lon/lat.');
    }
    return this.request('GET', appendQuery('/api/v1/map-viewport', {
      address: typeof address === 'string' && address.trim() ? address.trim() : undefined,
      city_code: typeof cityCode === 'string' && cityCode.trim() ? cityCode.trim() : undefined,
      lon,
      lat,
      layers: layers.trim(),
      ...query,
    }));
  }

  addressOverview(input) {
    const { address, city_code: cityCode, lon, lat, ...query } = input;
    if ((typeof address !== 'string' || !address.trim()) && (typeof cityCode !== 'string' || !cityCode.trim()) && (lon === undefined || lat === undefined) && !query.parcel_record_key) {
      throw new TypeError('address overview input requires address, city_code, lon/lat, or parcel_record_key.');
    }
    return this.request('GET', appendQuery('/api/v1/address-overview', {
      address: typeof address === 'string' && address.trim() ? address.trim() : undefined,
      city_code: typeof cityCode === 'string' && cityCode.trim() ? cityCode.trim() : undefined,
      lon,
      lat,
      ...query,
    }));
  }

  autocompleteAddress(input) {
    const { q, ...query } = input;
    if (typeof q !== 'string' || !q.trim()) {
      throw new TypeError('autocomplete input requires q.');
    }
    return this.request('GET', appendQuery('/api/v1/autocomplete/address', {
      q: q.trim(),
      ...query,
    }));
  }

  addressPageState(slug) {
    if (typeof slug !== 'string' || !slug.trim()) {
      throw new TypeError('address page state requires slug.');
    }
    return this.request('GET', `/api/v1/address-pages/${encodeURIComponent(slug.trim())}/state`);
  }

  addressDetails(input) {
    const { fields, ...locatorInput } = input;
    const query = normalizeAddressLocator(locatorInput);
    assertNormalizedAddressKeyIsAlone(query, 'address details input');
    if (!hasAddressLocator(query)) {
      throw new TypeError('address details input requires address, normalized_address_key, parcel_record_key, or lon/lat.');
    }
    return this.request('GET', appendQuery('/api/v1/address-details', {
      ...query,
      fields: normalizeCsvList(fields, 'address details fields'),
    }));
  }

  addressUnlock(input) {
    const body = normalizeAddressLocator(input);
    assertNormalizedAddressKeyIsAlone(body, 'address unlock input');
    if (!hasAddressLocator(body)) {
      throw new TypeError('address unlock input requires address, normalized_address_key, parcel_record_key, or lon/lat.');
    }
    return this.request('POST', '/api/v1/address-unlocks', { body });
  }

  accountUsage() {
    return this.request('GET', '/api/v1/account/usage');
  }

  communeSearch(input) {
    const { q, ...query } = input;
    if (typeof q !== 'string' || !q.trim()) {
      throw new TypeError('commune search input requires q.');
    }
    return this.request('GET', appendQuery('/api/v1/communes/search', { q: q.trim(), ...query }));
  }

  publicPreview(input) {
    const path = typeof input === 'string' ? input : input?.path;
    if (typeof path !== 'string' || !path.trim()) {
      throw new TypeError('public preview input requires path.');
    }
    return this.request('GET', appendQuery('/api/v1/public-preview', { path: path.trim() }));
  }

  mapFocusParcelle(input) {
    const recordKey = input.record_key ?? input.recordKey;
    return this.request('GET', appendQuery('/api/v1/map-focus/parcelle', {
      record_key: normalizeCsvList(recordKey, 'record-key'),
    }));
  }

  mapFocusParcelles(input) {
    const recordKeys = input.record_keys ?? input.recordKeys;
    return this.request('GET', appendQuery('/api/v1/map-focus/parcelles', {
      record_keys: normalizeCsvList(recordKeys, 'record-keys'),
    }));
  }

  mapFocusAddress(input) {
    const { address, city_code: cityCode, ...query } = input;
    if (typeof address !== 'string' || !address.trim()) {
      throw new TypeError('map focus address input requires address.');
    }
    return this.request('GET', appendQuery('/api/v1/map-focus/address', {
      address: address.trim(),
      city_code: cityCode,
      ...query,
    }));
  }

  mapFocusPublicLocation(input) {
    const { lon, lat, ...query } = input;
    if (lon === undefined || lat === undefined) {
      throw new TypeError('map focus public-location input requires lon and lat.');
    }
    return this.request('GET', appendQuery('/api/v1/map-focus/public-location', { lon, lat, ...query }));
  }

  mapFocusFeature(input) {
    const layerKey = input.layer_key ?? input.layerKey ?? input.layer;
    const featureKey = input.feature_key ?? input.featureKey;
    return this.request('GET', appendQuery('/api/v1/map-focus/feature', {
      layer_key: normalizeCsvList(layerKey, 'layer-key'),
      feature_key: normalizeCsvList(featureKey, 'feature-key'),
    }));
  }

  scoreAddress(input) {
    return this.request('POST', '/api/v1/score/address', { body: input });
  }

  scoreCompare(input) {
    return this.request('POST', '/api/v1/score/compare', { body: input });
  }

  scoreGrid(input) {
    return this.request('GET', appendQuery('/api/v1/score/grid', input));
  }

  scoreAddressSuggest(input) {
    const { q, ...query } = input;
    if (typeof q !== 'string' || !q.trim()) {
      throw new TypeError('score address suggest input requires q.');
    }
    return this.request('GET', appendQuery('/api/v1/score/address-suggest', {
      q: q.trim(),
      ...query,
    }));
  }
}

function usage() {
  return `1dex CLI

Usage:
  1dex <address> [options]
  1dex overview <address|--city-code|--lon/--lat|--parcel-record-key> [options]
  1dex details <address|--normalized-address-key|--parcel-record-key|--lon/--lat> --fields <csv> [options]
  1dex unlock <address|--normalized-address-key|--parcel-record-key|--lon/--lat> [options]
  1dex usage [options]
  1dex autocomplete <query> [options]
  1dex communes <query> [options]
  1dex preview <path> [options]
  1dex state <slug>
  1dex parcelles <address> [options]
  1dex dvf <address> [options]
  1dex travaux <address> [options]
  1dex iris <address> [options]
  1dex labels <address> [options]
  1dex layer <layer> <address|--city-code|--lon/--lat> [options]
  1dex viewport <address|--city-code|--lon/--lat> [options]
  1dex focus parcelle <record-key> [options]
  1dex focus parcelles <record-keys> [options]
  1dex focus address <address> [options]
  1dex focus public-location --lon <number> --lat <number> [options]
  1dex focus feature --layer-key <layer> --feature-key <key> [options]
  1dex score address <address> [options]
  1dex score compare [--input <json-or-@file>] [options]
  1dex score grid --bbox <bbox> --zoom <number> [options]
  1dex score suggest <query> [options]
  1dex examples
  1dex doctor [--address <address>] [options]

Options:
  -a, --address <text>                 Address to resolve. Overrides positional address.
  -d, --dvf-radius-m <number>          DVF radius in meters for address overview.
      --dvf-year <year>                DVF year filter for address overview.
      --parcel-record-key <key>        Parcel record key for address overview.
      --normalized-address-key <key>   Stable key returned by address-details or address-unlocks.
      --fields <csv>                   Address details fields, or all.
      --record-key <key>               Parcel focus record key.
      --record-keys <csv>              Parcel focus record keys.
      --path <path>                    Public preview path.
      --layer-key <key>                Map focus feature layer key.
      --feature-key <key>              Map focus feature key.
  -l, --layer <layer>                  Public layer: parcelles, dvf, travaux, iris, context, labels.
      --layers <csv>                   Viewport layers, e.g. context,iris.
      --slug <text>                    Address page slug.
      --limit <number>                 Suggestion limit for autocomplete or score suggest.
      --bbox <bbox>                    Score grid bbox: minLon,minLat,maxLon,maxLat.
      --zoom <number>                  Score grid zoom.
      --category <name>                Score grid category: global, market, daily_life, environment, vigilance, potential, price_m2.
      --profile <name>                 Optional score profile.
      --sort-by <name>                 Score compare sort key: global, market, daily_life, environment, vigilance, potential.
      --input <json-or-@file>          JSON body for score address/compare batch calls.
  -r, --viewport-render-mode <mode>    Response render mode. Verified value: features.
  -b, --viewport-bbox <bbox>           Map bbox: minLon,minLat,maxLon,maxLat.
  -z, --viewport-zoom <number>         Map zoom level.
      --city-code <code>               INSEE city code if already known.
      --lon <number>                   Longitude if already known.
      --lat <number>                   Latitude if already known.
      --base-url <url>                 Override API base URL.
      --api-key <key>                  Subscriber API key. Defaults to ONEDEX_API_KEY.
      --timeout-ms <number>            Request timeout in milliseconds. Default: 30000.
  -f, --format <json|csv|summary>      Output format. Default: json.
  -u, --url                            Print the generated URL and exit.
  -h, --help                           Show this help.
  -V, --version                        Show CLI version.

Environment:
  ONEDEX_BASE_URL (defaults to https://1dex.fr)
  ONEDEX_API_KEY adds Authorization: Bearer for subscriber endpoints
  ONEDEX_NO_UPDATE_CHECK=1 disables the npm version update notice
`;
}

function examples() {
  return `Examples:

  # Fastest path: install, then read the address overview.
  npm i -g @1dex-fr/1dex
  1dex "${DEFAULT_SAMPLE_ADDRESS}"

  # Public address overview (cards, market summary, nearby context).
  1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
  1dex overview --city-code 13001 --parcel-record-key parcel_123 --dvf-year 2024 --url

  # Subscriber address details and unlock flow.
  1dex details "10 rue des cordeliers aix" --fields summary,rail,tabs --api-key "$ONEDEX_API_KEY"
  1dex unlock "10 rue des cordeliers aix" --api-key "$ONEDEX_API_KEY"
  1dex usage --api-key "$ONEDEX_API_KEY" -f summary

  # Public address search and score suggest.
  1dex autocomplete "10 rue des cordeliers aix" --limit 5
  1dex score suggest "10 rue des cordeliers aix" --limit 5
  1dex communes aix --limit 5

  # Public preview, page-state, score grid, and viewport helpers.
  1dex preview /ville/aix-en-provence-13001 --url
  1dex state "10-rue-de-la-paix-paris-75002"
  1dex viewport "${DEFAULT_SAMPLE_ADDRESS}" --layers context,iris -f summary
  1dex focus public-location --lon 5.446766 --lat 43.529667 -f summary
  1dex score grid --bbox 5.4457,43.5274,5.4468,43.5282 --zoom 15 --category global -f summary

  # Public score helper for one address.
  1dex score address "${DEFAULT_SAMPLE_ADDRESS}" -f summary

  # Batch compare via inline JSON or @file.
  1dex score compare --input '{"items":[{"address":"10 rue des cordeliers aix"},{"address":"50 rue des tanneurs aix"}],"sortBy":"global"}'

  # Public map layers verified on 1dex.fr.
  1dex parcelles "${DEFAULT_SAMPLE_ADDRESS}" -f summary
  1dex dvf "${DEFAULT_SAMPLE_ADDRESS}" -f summary
  1dex travaux "${DEFAULT_SAMPLE_ADDRESS}" -f summary
  1dex labels "${DEFAULT_SAMPLE_ADDRESS}" -f summary
  1dex layer iris "${DEFAULT_SAMPLE_ADDRESS}" --format summary

  # Print the generated public URL without sending the request.
  1dex parcelles --address "${DEFAULT_SAMPLE_ADDRESS}" --url

  # Check that the public endpoint is reachable from this machine.
  1dex doctor
`;
}

function normalizeMapLayer(layer) {
  const normalized = String(layer ?? '').trim();
  const layerKey = PUBLIC_MAP_LAYER_ALIASES[normalized] ?? normalized;
  if (!PUBLIC_MAP_LAYERS.has(layerKey)) {
    throw new Error(`Unsupported public map layer: ${normalized || '(empty)'}.`);
  }
  return layerKey;
}

function readVersion() {
  try {
    const packageUrl = new URL('../package.json', import.meta.url);
    return JSON.parse(readFileSync(packageUrl, 'utf8')).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function parseVersionParts(version) {
  const [core] = String(version ?? '').replace(/^v/u, '').split('-');
  return core.split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(left, right) {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) {
      return 1;
    }
    if (leftValue < rightValue) {
      return -1;
    }
  }
  return 0;
}

function shouldCheckForUpdates() {
  const disabled = String(process.env.ONEDEX_NO_UPDATE_CHECK ?? '').toLowerCase();
  return disabled !== '1' && disabled !== 'true' && !process.env.CI;
}

async function readLatestVersion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1_000);
  try {
    const response = await globalThis.fetch(NPM_LATEST_URL, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const body = await response.json();
    return typeof body?.version === 'string' ? body.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function maybePrintUpdateNotice() {
  if (!shouldCheckForUpdates() || typeof globalThis.fetch !== 'function') {
    return;
  }

  const currentVersion = readVersion();
  const latestVersion = await readLatestVersion();
  if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0) {
    return;
  }

  console.error([
    `Update available: @1dex-fr/1dex ${currentVersion} -> ${latestVersion}`,
    'Run: npm i -g @1dex-fr/1dex',
  ].join('\n'));
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('-') || value === '-') {
      positional.push(value);
      continue;
    }

    const isLongFlag = value.startsWith('--');
    const rawKey = isLongFlag ? value.slice(2) : value.slice(1);
    const key = FLAG_ALIASES[rawKey] ?? rawKey;

    if (!VALUE_FLAGS.has(key) && !BOOLEAN_FLAGS.has(key)) {
      throw new Error(`Unknown option: ${value}`);
    }

    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }

    const next = argv[index + 1];
    if (next === undefined || isOptionToken(next)) {
      throw new Error(`Missing value for option: ${value}`);
    }

    flags[key] = next;
    index += 1;
  }

  return { positional, flags };
}

function isOptionToken(value) {
  if (value.startsWith('--')) {
    return true;
  }
  if (!value.startsWith('-') || value.length < 2) {
    return false;
  }
  return FLAG_ALIASES[value.slice(1)] !== undefined;
}

function createClient(flags) {
  return new OneDexClient({
    baseUrl: flags['base-url'] ?? process.env.ONEDEX_BASE_URL,
    apiKey: flags['api-key'] ?? process.env.ONEDEX_API_KEY,
    timeoutMs: readOptionalNumber(flags['timeout-ms'], 'timeout-ms') ?? 30_000,
  });
}

function readOptionalNumber(value, name) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${name} must be a number.`);
  }
  return number;
}

function readFormat(flags) {
  const format = flags.format ?? 'json';
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new Error(`Unsupported format: ${format}. Use json, csv, or summary.`);
  }
  return format;
}

function readSubjectText(flags, subjectParts, errorMessage = 'Missing address. Use positional text or --address <text>.') {
  const subject = String(flags.address ?? subjectParts.join(' ')).trim();
  if (!subject) {
    throw new Error(errorMessage);
  }
  return subject;
}

function buildMapLayerInput(flags, subjectParts, defaultLayer = 'parcelles') {
  const lon = readOptionalNumber(flags.lon, 'lon');
  const lat = readOptionalNumber(flags.lat, 'lat');
  const cityCode = flags['city-code'];
  const address = String(flags.address ?? subjectParts.join(' ')).trim();
  if (!address && (lon === undefined || lat === undefined) && !cityCode) {
    throw new Error('Missing address, city code, or coordinates. Use positional text, --address <text>, --city-code <code>, or --lon/--lat.');
  }
  return {
    address: address || undefined,
    layer: normalizeMapLayer(flags.layer ?? defaultLayer),
    city_code: flags['city-code'],
    lon,
    lat,
    viewport_bbox: flags['viewport-bbox'],
    viewport_zoom: readOptionalNumber(flags['viewport-zoom'], 'viewport-zoom'),
    viewport_render_mode: flags['viewport-render-mode'] ?? 'features',
  };
}

function buildOverviewInput(flags, subjectParts) {
  const lon = readOptionalNumber(flags.lon, 'lon');
  const lat = readOptionalNumber(flags.lat, 'lat');
  const address = String(flags.address ?? subjectParts.join(' ')).trim();
  const cityCode = flags['city-code'];
  const parcelRecordKey = flags['parcel-record-key'];
  if (!address && !cityCode && (lon === undefined || lat === undefined) && !parcelRecordKey) {
    throw new Error('Missing overview location. Use positional text, --address, --city-code, --lon/--lat, or --parcel-record-key.');
  }
  return {
    address: address || undefined,
    city_code: cityCode,
    lon,
    lat,
    parcel_record_key: parcelRecordKey,
    dvf_radius_m: readOptionalNumber(flags['dvf-radius-m'], 'dvf-radius-m') ?? 600,
    dvf_year: readOptionalNumber(flags['dvf-year'], 'dvf-year'),
  };
}

function buildAddressLocatorInput(flags, subjectParts, label = 'address input') {
  const lon = readOptionalNumber(flags.lon, 'lon');
  const lat = readOptionalNumber(flags.lat, 'lat');
  const address = String(flags.address ?? subjectParts.join(' ')).trim();
  const input = {
    address: address || undefined,
    city_code: flags['city-code'],
    lon,
    lat,
    parcel_record_key: flags['parcel-record-key'],
    normalized_address_key: flags['normalized-address-key'],
  };
  assertNormalizedAddressKeyIsAlone(input, label);
  if (!hasAddressLocator(input)) {
    throw new Error(`Missing ${label}. Use positional text, --normalized-address-key, --parcel-record-key, or --lon/--lat.`);
  }
  return input;
}

function buildAddressDetailsInput(flags, subjectParts) {
  const fields = String(flags.fields ?? '').trim();
  if (!fields) {
    throw new Error('Missing fields. Use --fields <summary,rail,tabs|all>.');
  }
  return {
    ...buildAddressLocatorInput(flags, subjectParts, 'address details locator'),
    fields,
    dvf_radius_m: readOptionalNumber(flags['dvf-radius-m'], 'dvf-radius-m'),
    dvf_year: readOptionalNumber(flags['dvf-year'], 'dvf-year'),
  };
}

function buildAddressUnlockInput(flags, subjectParts) {
  return buildAddressLocatorInput(flags, subjectParts, 'address unlock locator');
}

function buildAutocompleteInput(flags, subjectParts) {
  const q = readSubjectText(flags, subjectParts, 'Missing query. Use positional text or --address <text>.');
  return {
    q,
    limit: readOptionalNumber(flags.limit, 'limit') ?? 5,
  };
}

function buildCommuneSearchInput(flags, subjectParts) {
  return {
    q: readSubjectText(flags, subjectParts, 'Missing commune query. Use positional text or --address <text>.'),
    limit: readOptionalNumber(flags.limit, 'limit') ?? 5,
  };
}

function buildPreviewInput(flags, subjectParts) {
  const path = String(flags.path ?? subjectParts.join(' ')).trim();
  if (!path) {
    throw new Error('Missing preview path. Use positional path or --path <path>.');
  }
  return { path };
}

function buildStateInput(flags, subjectParts) {
  const slug = String(flags.slug ?? subjectParts.join(' ')).trim();
  if (!slug) {
    throw new Error('Missing slug. Use positional text or --slug <text>.');
  }
  return slug;
}

function buildViewportInput(flags, subjectParts) {
  const lon = readOptionalNumber(flags.lon, 'lon');
  const lat = readOptionalNumber(flags.lat, 'lat');
  const address = String(flags.address ?? subjectParts.join(' ')).trim();
  const cityCode = flags['city-code'];
  if (!address && (lon === undefined || lat === undefined) && !cityCode) {
    throw new Error('Missing address, city code, or coordinates. Use positional text, --address <text>, --city-code <code>, or --lon/--lat.');
  }
  return {
    address: address || undefined,
    layers: String(flags.layers ?? 'context,iris').trim(),
    city_code: flags['city-code'],
    lon,
    lat,
  };
}

function buildMapFocusInput(flags, subjectParts, mode) {
  if (mode === 'parcelle') {
    const recordKey = String(flags['record-key'] ?? subjectParts.join(' ')).trim();
    if (!recordKey) {
      throw new Error('Missing focus record key. Use positional text or --record-key <key>.');
    }
    return { record_key: recordKey };
  }
  if (mode === 'parcelles') {
    const recordKeys = String(flags['record-keys'] ?? subjectParts.join(',')).trim();
    if (!recordKeys) {
      throw new Error('Missing focus record keys. Use positional CSV or --record-keys <csv>.');
    }
    return { record_keys: recordKeys };
  }
  if (mode === 'address') {
    return {
      address: readSubjectText(flags, subjectParts, 'Missing focus address. Use positional text or --address <text>.'),
      city_code: flags['city-code'],
    };
  }
  if (mode === 'public-location') {
    const lon = readOptionalNumber(flags.lon, 'lon');
    const lat = readOptionalNumber(flags.lat, 'lat');
    if (lon === undefined || lat === undefined) {
      throw new Error('Missing focus coordinates. Use --lon and --lat.');
    }
    return { lon, lat };
  }
  if (mode === 'feature') {
    const hasLayerFlag = flags['layer-key'] !== undefined || flags.layer !== undefined;
    const layerKey = String(flags['layer-key'] ?? flags.layer ?? subjectParts[0] ?? '').trim();
    const featureKey = String(flags['feature-key'] ?? subjectParts.slice(hasLayerFlag ? 0 : 1).join(' ')).trim();
    if (!layerKey || !featureKey) {
      throw new Error('Missing focus feature. Use --layer-key and --feature-key.');
    }
    return { layer_key: layerKey, feature_key: featureKey };
  }
  throw new Error(`Unknown map focus mode: ${mode || '(empty)'}.`);
}

function buildScoreGridInput(flags) {
  const bbox = String(flags.bbox ?? '').trim();
  if (!bbox) {
    throw new Error('Missing bbox. Use --bbox <minLon,minLat,maxLon,maxLat>.');
  }
  const zoom = readOptionalNumber(flags.zoom, 'zoom');
  if (zoom === undefined) {
    throw new Error('Missing zoom. Use --zoom <number>.');
  }
  return {
    bbox,
    zoom,
    category: flags.category,
  };
}

function readJsonInput(raw) {
  if (!raw) {
    return null;
  }
  const source = String(raw).trim();
  const text = source.startsWith('@')
    ? readFileSync(source.slice(1), 'utf8')
    : (!source.startsWith('{') && !source.startsWith('[') && existsSync(source)
      ? readFileSync(source, 'utf8')
      : source);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON for --input: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function buildScoreBody(flags, subjectParts, mode) {
  const fromInput = readJsonInput(flags.input);
  const body = fromInput ?? {
    items: [{ address: readSubjectText(flags, subjectParts, 'Missing score address. Use positional text, --address <text>, or --input <json>.') }],
  };

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('Score payload must be a JSON object.');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('Score payload requires items[].');
  }
  if (flags.profile) {
    body.profile = flags.profile;
  }
  if (mode === 'compare' && flags['sort-by']) {
    body.sortBy = flags['sort-by'];
  }
  return body;
}

function resolveCommand(positional) {
  const [resource, action, ...subjectParts] = positional;

  if (resource && ![
    'address-page-state',
    'address-details',
    'address-unlocks',
    'autocomplete',
    'communes',
    'context',
    'details',
    'doctor',
    'dvf',
    'examples',
    'focus',
    'help',
    'iris',
    'labels',
    'layer',
    'map',
    'overview',
    'parcelles',
    'preview',
    'score',
    'state',
    'travaux',
    'unlock',
    'usage',
    'viewport',
  ].includes(resource)) {
    return { name: 'overview', subjectParts: positional };
  }

  if (resource === 'map' && action === 'focus') {
    return { name: 'map-focus', mode: subjectParts[0], subjectParts: subjectParts.slice(1) };
  }

  if (resource === 'map' && action) {
    return { name: 'layer', layer: action, subjectParts };
  }

  if (resource === 'parcelles' || resource === 'dvf' || resource === 'travaux' || resource === 'iris' || resource === 'context' || resource === 'labels') {
    return {
      name: 'layer',
      layer: resource,
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'layer') {
    return {
      name: 'layer',
      layer: action,
      subjectParts,
    };
  }

  if (resource === 'overview') {
    return {
      name: 'overview',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'autocomplete') {
    return {
      name: 'autocomplete',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'communes') {
    return {
      name: 'communes',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'preview') {
    return {
      name: 'preview',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'details' || resource === 'address-details') {
    return {
      name: 'address-details',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'unlock' || resource === 'address-unlocks') {
    return {
      name: 'address-unlock',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'usage') {
    return {
      name: 'account-usage',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'focus') {
    return {
      name: 'map-focus',
      mode: action,
      subjectParts,
    };
  }

  if (resource === 'state' || resource === 'address-page-state') {
    return {
      name: 'state',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'viewport') {
    return {
      name: 'viewport',
      subjectParts: [action, ...subjectParts].filter((part) => part !== undefined),
    };
  }

  if (resource === 'score' && action === 'address') {
    return { name: 'score-address', subjectParts };
  }
  if (resource === 'score' && action === 'compare') {
    return { name: 'score-compare', subjectParts };
  }
  if (resource === 'score' && action === 'grid') {
    return { name: 'score-grid', subjectParts };
  }
  if (resource === 'score' && (action === 'suggest' || action === 'address-suggest')) {
    return { name: 'score-suggest', subjectParts };
  }

  if (resource === 'examples' || resource === 'doctor' || resource === 'help') {
    return { name: resource, subjectParts: [action, ...subjectParts].filter(Boolean) };
  }

  return { name: 'unknown', subjectParts: positional };
}

function buildMapLayerUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  const { layer = 'parcelles', ...query } = input;
  const layerKey = normalizeMapLayer(layer);
  return `${baseUrl}${appendQuery(`/api/v1/map-layer/${encodeURIComponent(layerKey)}`, query)}`;
}

function buildOverviewUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/address-overview', input)}`;
}

function buildAddressDetailsUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/address-details', input)}`;
}

function buildAutocompleteUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/autocomplete/address', input)}`;
}

function buildCommuneSearchUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/communes/search', input)}`;
}

function buildPreviewUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/public-preview', input)}`;
}

function buildStateUrl(flags, slug) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}/api/v1/address-pages/${encodeURIComponent(slug)}/state`;
}

function buildViewportUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/map-viewport', input)}`;
}

function buildScoreGridUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/score/grid', input)}`;
}

function buildScoreSuggestUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/api/v1/score/address-suggest', input)}`;
}

function buildMapFocusUrl(flags, mode, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery(`/api/v1/map-focus/${encodeURIComponent(mode)}`, input)}`;
}

function buildEndpointUrl(flags, path) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${path}`;
}

function toCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function isOverviewResponse(response) {
  return Array.isArray(response?.cards);
}

function isMapViewportResponse(response) {
  return response && typeof response.layers === 'object' && response.layers !== null;
}

function isMapLayerResponse(response) {
  return typeof response?.layerKey === 'string' && (
    response.data !== undefined
    || response.summary !== undefined
    || response.label !== undefined
  );
}

function isAutocompleteLikeResponse(response) {
  return Array.isArray(response?.suggestions);
}

function isScoreAddressResponse(response) {
  return response?.version === 'score-v1' && Array.isArray(response?.items);
}

function isScoreCompareResponse(response) {
  return response?.version === 'score-v1' && Array.isArray(response?.ranking);
}

function isScoreGridResponse(response) {
  return response?.version === 'score-v1' && Array.isArray(response?.cells);
}

function isAddressPageStateResponse(response) {
  return response?.page && response?.access && response?.report;
}

function isAddressDetailsResponse(response) {
  return response?.version === 'address-details-v1';
}

function isAddressUnlockResponse(response) {
  return response?.version === 'address-unlock-v1';
}

function isAccountUsageResponse(response) {
  return response?.version === 'account-usage-v1';
}

function isPublicPreviewResponse(response) {
  return response?.version === 'public-preview-v1';
}

function isCommuneSearchResponse(response) {
  return Array.isArray(response?.matches);
}

function isMapFocusResponse(response) {
  return response && typeof response === 'object' && (
    response.quickView
    || response.quickViews
    || response.resolvedAddress
    || response.feature
  );
}

function printCsv(response) {
  if (isOverviewResponse(response)) {
    console.log(['eyebrow', 'label', 'value', 'detail', 'tabKey', 'sectionKey'].join(','));
    for (const card of response.cards) {
      console.log([
        card?.eyebrow,
        card?.label,
        card?.value,
        card?.detail,
        card?.tabKey,
        card?.sectionKey,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  if (isMapViewportResponse(response)) {
    console.log(['layerKey', 'status', 'feature_count', 'summary'].join(','));
    for (const [layerKey, layer] of Object.entries(response.layers)) {
      console.log([
        layerKey,
        layer?.status,
        layer?.data?.features?.length,
        layer?.summary,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  if (isMapLayerResponse(response)) {
    console.log(['layerKey', 'status', 'feature_count', 'summary'].join(','));
    console.log([
      response?.layerKey,
      response?.status,
      response?.data?.features?.length,
      response?.summary,
    ].map(toCsvValue).join(','));
    return;
  }

  if (isAutocompleteLikeResponse(response)) {
    const rows = Array.isArray(response.items) && response.items.length > 0 ? response.items : response.suggestions;
    console.log(['label', 'match_score', 'postcode', 'city', 'type', 'address_id', 'lon', 'lat'].join(','));
    for (const item of rows) {
      console.log([
        item?.label,
        item?.match_score,
        item?.postcode,
        item?.city,
        item?.type,
        item?.address_id,
        item?.coordinates?.lon,
        item?.coordinates?.lat,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  if (isScoreAddressResponse(response)) {
    console.log(['id', 'label', 'postcode', 'city', 'global_score', 'global_label', 'confidence'].join(','));
    for (const item of response.items) {
      console.log([
        item?.id,
        item?.address?.label,
        item?.address?.postcode,
        item?.address?.city,
        item?.score?.global,
        item?.score?.label,
        item?.score?.confidence,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  if (isScoreCompareResponse(response)) {
    console.log(['rank', 'itemIndex', 'label', 'globalScore', 'sortScore', 'bestCategory', 'mainCheck'].join(','));
    for (const row of response.ranking) {
      console.log([
        row?.rank,
        row?.itemIndex,
        row?.label,
        row?.globalScore,
        row?.sortScore,
        row?.bestCategory,
        row?.mainCheck,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  if (isScoreGridResponse(response)) {
    console.log(['id', 'lat', 'lng', 'score', 'intensity', 'confidence', 'label'].join(','));
    for (const cell of response.cells) {
      console.log([
        cell?.id,
        cell?.lat,
        cell?.lng,
        cell?.score,
        cell?.intensity,
        cell?.confidence,
        cell?.label,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  if (isAddressPageStateResponse(response)) {
    console.log(['slug', 'index_state', 'authenticated', 'access_level', 'report_state'].join(','));
    console.log([
      response?.page?.slug,
      response?.page?.index_state,
      response?.viewer?.authenticated,
      response?.access?.access_level,
      response?.report?.report_state,
    ].map(toCsvValue).join(','));
    return;
  }

  if (isCommuneSearchResponse(response)) {
    console.log(['cityCode', 'cityLabel', 'href'].join(','));
    for (const match of response.matches) {
      console.log([
        match?.cityCode,
        match?.cityLabel,
        match?.href,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  console.log(JSON.stringify(response, null, 2));
}

function printSummary(response) {
  if (isOverviewResponse(response)) {
    const lines = [
      `version=${response?.version ?? ''}`,
      `cards=${response.cards.length}`,
    ];
    for (const card of response.cards) {
      lines.push([
        card?.eyebrow,
        card?.label,
        card?.value,
        card?.detail,
      ].filter(Boolean).join(' | '));
    }
    console.log(lines.join('\n'));
    return;
  }

  if (isMapViewportResponse(response)) {
    const lines = [
      `status=${response?.status ?? ''}`,
      `layers=${Object.keys(response.layers).length}`,
    ];
    for (const [layerKey, layer] of Object.entries(response.layers)) {
      lines.push(`${layerKey} | status=${layer?.status ?? ''} | features=${layer?.data?.features?.length ?? 0} | ${layer?.summary ?? ''}`);
    }
    console.log(lines.join('\n'));
    return;
  }

  if (isMapLayerResponse(response)) {
    console.log([
      `layerKey=${response?.layerKey ?? ''}`,
      `status=${response?.status ?? ''}`,
      `features=${response?.data?.features?.length ?? 0}`,
      `summary=${response?.summary ?? ''}`,
    ].join('\n'));
    return;
  }

  if (isAutocompleteLikeResponse(response)) {
    const rows = Array.isArray(response.items) && response.items.length > 0 ? response.items : response.suggestions;
    const lines = [
      `status=${response?.status ?? ''}`,
      `suggestions=${rows.length}`,
    ];
    for (const item of rows) {
      lines.push([
        item?.label,
        item?.postcode,
        item?.city,
        item?.type,
      ].filter(Boolean).join(' | '));
    }
    console.log(lines.join('\n'));
    return;
  }

  if (isScoreAddressResponse(response)) {
    const lines = [
      `version=${response?.version ?? ''}`,
      `items=${response.items.length}`,
      `warnings=${response?.warnings?.length ?? 0}`,
    ];
    for (const item of response.items) {
      lines.push([
        item?.address?.label,
        `global=${item?.score?.global ?? ''}`,
        item?.score?.label,
        item?.score?.confidence,
      ].filter(Boolean).join(' | '));
    }
    console.log(lines.join('\n'));
    return;
  }

  if (isScoreCompareResponse(response)) {
    const lines = [
      `version=${response?.version ?? ''}`,
      `sortBy=${response?.sortBy ?? ''}`,
      `ranking=${response?.ranking?.length ?? 0}`,
      `summary=${response?.summary?.text ?? ''}`,
    ];
    for (const row of response.ranking ?? []) {
      lines.push([
        `#${row?.rank ?? ''}`,
        row?.label,
        `global=${row?.globalScore ?? ''}`,
        `sort=${row?.sortScore ?? ''}`,
      ].filter(Boolean).join(' | '));
    }
    console.log(lines.join('\n'));
    return;
  }

  if (isScoreGridResponse(response)) {
    console.log([
      `version=${response?.version ?? ''}`,
      `category=${response?.category ?? ''}`,
      `cells=${response?.cells?.length ?? 0}`,
      `zoom=${response?.zoom ?? ''}`,
    ].join('\n'));
    return;
  }

  if (isAddressPageStateResponse(response)) {
    console.log([
      `slug=${response?.page?.slug ?? ''}`,
      `index_state=${response?.page?.index_state ?? ''}`,
      `authenticated=${response?.viewer?.authenticated ?? false}`,
      `access_level=${response?.access?.access_level ?? ''}`,
      `report_state=${response?.report?.report_state ?? ''}`,
    ].join('\n'));
    return;
  }

  if (isAddressDetailsResponse(response)) {
    console.log([
      `version=${response?.version ?? ''}`,
      `fields=${(response?.fields ?? []).join(',')}`,
      `resolved=${response?.resolved?.address ?? response?.resolved?.cityLabel ?? ''}`,
      `degraded=${response?.degraded?.status ?? ''}`,
    ].join('\n'));
    return;
  }

  if (isAddressUnlockResponse(response)) {
    console.log([
      `version=${response?.version ?? ''}`,
      `normalized_address_key=${response?.normalized_address_key ?? ''}`,
      `status=${response?.result?.status ?? ''}`,
      `details_url=${response?.details_url ?? ''}`,
    ].join('\n'));
    return;
  }

  if (isAccountUsageResponse(response)) {
    const creditRemaining = response?.credits?.total_remaining;
    console.log([
      `version=${response?.version ?? ''}`,
      `api_windows=${response?.api_points?.length ?? 0}`,
      `credits_remaining=${creditRemaining ?? ''}`,
      `subscription=${response?.subscription?.status ?? 'none'}`,
    ].join('\n'));
    return;
  }

  if (isPublicPreviewResponse(response)) {
    console.log([
      `version=${response?.version ?? ''}`,
      `kind=${response?.kind ?? ''}`,
      `title=${response?.title ?? ''}`,
      `canonicalPath=${response?.canonicalPath ?? ''}`,
    ].join('\n'));
    return;
  }

  if (isCommuneSearchResponse(response)) {
    const lines = [
      `status=${response?.status ?? ''}`,
      `matches=${response.matches.length}`,
    ];
    for (const match of response.matches) {
      lines.push([match?.cityCode, match?.cityLabel, match?.href].filter(Boolean).join(' | '));
    }
    console.log(lines.join('\n'));
    return;
  }

  if (isMapFocusResponse(response)) {
    console.log([
      `status=${response?.status ?? ''}`,
      `quickViews=${response?.quickViews?.length ?? (response?.quickView ? 1 : 0)}`,
      `layerKey=${response?.layerKey ?? ''}`,
      `feature=${response?.feature?.id ?? ''}`,
    ].join('\n'));
    return;
  }

  console.log(JSON.stringify(response, null, 2));
}

function printResult(response, flags) {
  const format = readFormat(flags);
  if (format === 'csv') {
    printCsv(response);
    return;
  }
  if (format === 'summary') {
    printSummary(response);
    return;
  }
  console.log(JSON.stringify(response, null, 2));
}

async function runDoctor(flags) {
  const input = buildMapLayerInput(
    { ...flags, address: flags.address ?? DEFAULT_SAMPLE_ADDRESS },
    [],
  );
  const url = buildMapLayerUrl(flags, input);
  const startedAt = Date.now();
  const client = createClient(flags);
  const response = await client.map.layer(input);
  const durationMs = Date.now() - startedAt;

  console.log([
    '1dex doctor: ok',
    `baseUrl=${normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL)}`,
    `endpoint=/api/v1/map-layer/${normalizeMapLayer(input.layer)}`,
    `url=${url}`,
    `durationMs=${durationMs}`,
    `status=${response?.status ?? ''}`,
    `features=${response?.data?.features?.length ?? 0}`,
  ].join('\n'));
}

function printCliHint(error) {
  if (!(error instanceof Error)) {
    return;
  }
  if (/Unknown command|Unknown option|Missing address|Missing .*locator|Missing commune query|Missing preview path|Missing focus|Missing fields|Missing slug|Missing bbox|Missing zoom|Missing value|Unsupported format|Unsupported public map layer|must be a number|Score payload requires items|Invalid JSON/u.test(error.message)) {
    console.error('Hint: run "1dex --help" or "1dex examples".');
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  let command = resolveCommand(positional);

  if (flags.version) {
    console.log(readVersion());
    return;
  }

  if (!command.name || command.name === 'help' || flags.help) {
    console.log(usage());
    return;
  }

  if (command.name === 'examples') {
    console.log(examples());
    return;
  }

  if (command.name === 'doctor') {
    await runDoctor(flags);
    await maybePrintUpdateNotice();
    return;
  }

  if (command.name === 'unknown' && flags.address) {
    command = { name: 'overview', subjectParts: [] };
  }

  let response;
  const client = createClient(flags);

  if (command.name === 'layer') {
    const input = buildMapLayerInput(flags, command.subjectParts, command.layer);
    if (flags.url) {
      console.log(buildMapLayerUrl(flags, input));
      return;
    }
    response = await client.map.layer(input);
  } else if (command.name === 'overview') {
    const input = buildOverviewInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildOverviewUrl(flags, input));
      return;
    }
    response = await client.overview.address(input);
  } else if (command.name === 'address-details') {
    const input = buildAddressDetailsInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildAddressDetailsUrl(flags, input));
      return;
    }
    response = await client.address.details(input);
  } else if (command.name === 'address-unlock') {
    const input = buildAddressUnlockInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildEndpointUrl(flags, '/api/v1/address-unlocks'));
      return;
    }
    response = await client.address.unlock(input);
  } else if (command.name === 'account-usage') {
    if (flags.url) {
      console.log(buildEndpointUrl(flags, '/api/v1/account/usage'));
      return;
    }
    response = await client.account.usage();
  } else if (command.name === 'autocomplete') {
    const input = buildAutocompleteInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildAutocompleteUrl(flags, input));
      return;
    }
    response = await client.autocomplete.address(input);
  } else if (command.name === 'communes') {
    const input = buildCommuneSearchInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildCommuneSearchUrl(flags, input));
      return;
    }
    response = await client.communes.search(input);
  } else if (command.name === 'preview') {
    const input = buildPreviewInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildPreviewUrl(flags, input));
      return;
    }
    response = await client.preview.byPath(input);
  } else if (command.name === 'state') {
    const slug = buildStateInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildStateUrl(flags, slug));
      return;
    }
    response = await client.addressPages.state(slug);
  } else if (command.name === 'viewport') {
    const input = buildViewportInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildViewportUrl(flags, input));
      return;
    }
    response = await client.map.viewport(input);
  } else if (command.name === 'map-focus') {
    const mode = command.mode;
    const input = buildMapFocusInput(flags, command.subjectParts, mode);
    if (flags.url) {
      console.log(buildMapFocusUrl(flags, mode, input));
      return;
    }
    if (mode === 'parcelle') {
      response = await client.map.focus.parcelle(input);
    } else if (mode === 'parcelles') {
      response = await client.map.focus.parcelles(input);
    } else if (mode === 'address') {
      response = await client.map.focus.address(input);
    } else if (mode === 'public-location') {
      response = await client.map.focus.publicLocation(input);
    } else if (mode === 'feature') {
      response = await client.map.focus.feature(input);
    } else {
      throw new Error(`Unknown map focus mode: ${mode || '(empty)'}.`);
    }
  } else if (command.name === 'score-grid') {
    const input = buildScoreGridInput(flags);
    if (flags.url) {
      console.log(buildScoreGridUrl(flags, input));
      return;
    }
    response = await client.score.grid(input);
  } else if (command.name === 'score-suggest') {
    const input = buildAutocompleteInput(flags, command.subjectParts);
    if (flags.url) {
      console.log(buildScoreSuggestUrl(flags, input));
      return;
    }
    response = await client.score.addressSuggest(input);
  } else if (command.name === 'score-address') {
    const body = buildScoreBody(flags, command.subjectParts, 'address');
    if (flags.url) {
      console.log(buildEndpointUrl(flags, '/api/v1/score/address'));
      return;
    }
    response = await client.score.address(body);
  } else if (command.name === 'score-compare') {
    const body = buildScoreBody(flags, command.subjectParts, 'compare');
    if (flags.url) {
      console.log(buildEndpointUrl(flags, '/api/v1/score/compare'));
      return;
    }
    response = await client.score.compare(body);
  } else {
    throw new Error(`Unknown command: ${process.argv.slice(2).join(' ') || '(empty)'}`);
  }

  printResult(response, flags);
  await maybePrintUpdateNotice();
}

main().catch((error) => {
  if (error instanceof OneDexApiError) {
    console.error(`${error.message} (${error.status || 'network'})`);
    if (error.requestId) {
      console.error(`request_id=${error.requestId}`);
    }
  } else {
    console.error(error instanceof Error ? error.message : String(error));
    printCliHint(error);
  }
  process.exitCode = 1;
});
