#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const DEFAULT_BASE_URL = 'https://1dex.fr';
const DEFAULT_SAMPLE_ADDRESS = '50 rue des tanneurs aix';
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
  'base-url',
  'city-code',
  'format',
  'layer',
  'lat',
  'lon',
  'timeout-ms',
  'viewport-bbox',
  'viewport-render-mode',
  'viewport-zoom',
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

    if (typeof this.fetch !== 'function') {
      throw new TypeError('A fetch implementation is required.');
    }

    this.map = Object.freeze({
      parcelles: (input) => this.mapParcelles(input),
      layer: (input) => this.mapLayer(input),
    });
  }

  async request(method, path) {
    const controller = new AbortController();
    const timer = this.timeoutMs > 0
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : undefined;

    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { accept: 'application/json' },
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

    const body = await readJsonResponse(response);
    if (!response.ok) {
      const warningMessage = body?.warnings?.find((warning) => warning?.message)?.message;
      throw new OneDexApiError(warningMessage ?? `1dex API returned ${response.status}.`, {
        status: response.status,
        body,
        requestId: body?.request_id ?? response.headers.get('x-request-id'),
      });
    }
    return body;
  }

  mapParcelles(input) {
    return this.mapLayer({ ...input, layer: 'parcelles' });
  }

  mapLayer(input) {
    const { address, layer = 'parcelles', ...query } = input;
    if (typeof address !== 'string' || !address.trim()) {
      throw new TypeError('map layer input requires address.');
    }
    const layerKey = normalizeMapLayer(layer);
    const path = appendQuery(`/explore/map-layer/${encodeURIComponent(layerKey)}`, {
      address: address.trim(),
      ...query,
    });
    return this.request('GET', path);
  }
}

function usage() {
  return `1dex CLI

Usage:
  1dex <address> [options]
  1dex parcelles <address> [options]
  1dex dvf <address> [options]
  1dex travaux <address> [options]
  1dex iris <address> [options]
  1dex layer <layer> <address> [options]
  1dex map parcelles <address> [options]
  1dex map parcelles --address <address> [options]
  1dex examples
  1dex doctor [--address <address>] [options]

Options:
  -a, --address <text>                 Address to resolve. Overrides positional address.
  -l, --layer <layer>                  Public layer: parcelles, dvf, travaux, iris, context, labels.
  -r, --viewport-render-mode <mode>    Response render mode. Verified value: features.
  -b, --viewport-bbox <bbox>           Map bbox: minLon,minLat,maxLon,maxLat.
  -z, --viewport-zoom <number>         Map zoom level.
      --city-code <code>               INSEE city code if already known.
      --lon <number>                   Longitude if already known.
      --lat <number>                   Latitude if already known.
      --base-url <url>                 Override API base URL.
      --timeout-ms <number>            Request timeout in milliseconds. Default: 30000.
  -f, --format <json|csv|summary>      Output format. Default: json.
  -u, --url                            Print the generated URL and exit.
  -h, --help                           Show this help.
  -V, --version                        Show CLI version.

Environment:
  ONEDEX_BASE_URL (defaults to https://1dex.fr)
`;
}

function examples() {
  return `Examples:

  # Fastest path: install, then resolve parcels around an address.
  npm i -g @1dex-fr/1dex
  1dex "${DEFAULT_SAMPLE_ADDRESS}"

  # Fastest path: resolve parcels around an address.
  1dex parcelles "${DEFAULT_SAMPLE_ADDRESS}" -f summary

  # Public DVF and active works parcel overlays verified on 1dex.fr.
  1dex dvf "${DEFAULT_SAMPLE_ADDRESS}" -f summary
  1dex travaux "${DEFAULT_SAMPLE_ADDRESS}" -f summary

  # Same command, explicit namespace.
  1dex map parcelles "${DEFAULT_SAMPLE_ADDRESS}" --format json
  1dex layer iris "${DEFAULT_SAMPLE_ADDRESS}" --format summary

  # Print the generated public URL without sending the request.
  1dex parcelles --address "${DEFAULT_SAMPLE_ADDRESS}" --url

  # Reuse map context when your app already knows it.
  1dex parcelles "${DEFAULT_SAMPLE_ADDRESS}" \\
    --lon 5.446245 \\
    --lat 43.52782 \\
    --viewport-bbox 5.4457,43.5274,5.4468,43.5282 \\
    --viewport-zoom 19 \\
    --format csv

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

function buildMapLayerInput(flags, subjectParts, defaultLayer = 'parcelles') {
  const address = String(flags.address ?? subjectParts.join(' ')).trim();
  if (!address) {
    throw new Error('Missing address. Use positional text or --address <text>.');
  }
  return {
    address,
    layer: normalizeMapLayer(flags.layer ?? defaultLayer),
    city_code: flags['city-code'],
    lon: readOptionalNumber(flags.lon, 'lon'),
    lat: readOptionalNumber(flags.lat, 'lat'),
    viewport_bbox: flags['viewport-bbox'],
    viewport_zoom: readOptionalNumber(flags['viewport-zoom'], 'viewport-zoom'),
    viewport_render_mode: flags['viewport-render-mode'] ?? 'features',
  };
}

function resolveCommand(positional) {
  const [resource, action, ...subjectParts] = positional;

  if (resource && ![
    'context',
    'doctor',
    'dvf',
    'examples',
    'help',
    'iris',
    'labels',
    'layer',
    'map',
    'parcelles',
    'travaux',
  ].includes(resource)) {
    return { name: 'layer', layer: 'parcelles', subjectParts: positional };
  }

  if (resource === 'map' && action === 'parcelles') {
    return { name: 'layer', layer: 'parcelles', subjectParts };
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

  if (resource === 'examples' || resource === 'doctor' || resource === 'help') {
    return { name: resource, subjectParts: [action, ...subjectParts].filter(Boolean) };
  }

  return { name: 'unknown', subjectParts: positional };
}

function buildMapLayerUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  const { layer = 'parcelles', ...query } = input;
  const layerKey = normalizeMapLayer(layer);
  return `${baseUrl}${appendQuery(`/explore/map-layer/${encodeURIComponent(layerKey)}`, query)}`;
}

function toCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function printCsv(response) {
  console.log(['layerKey', 'status', 'feature_count', 'summary'].join(','));
  console.log([
    response?.layerKey,
    response?.status,
    response?.data?.features?.length,
    response?.summary,
  ].map(toCsvValue).join(','));
}

function printSummary(response) {
  console.log([
    `layerKey=${response?.layerKey ?? ''}`,
    `status=${response?.status ?? ''}`,
    `features=${response?.data?.features?.length ?? 0}`,
    `summary=${response?.summary ?? ''}`,
  ].join('\n'));
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
    `endpoint=/explore/map-layer/${normalizeMapLayer(input.layer)}`,
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
  if (/Unknown command|Unknown option|Missing address|Missing value|Unsupported format|Unsupported public map layer|must be a number/u.test(error.message)) {
    console.error('Hint: run "1dex --help" or "1dex examples".');
  }
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = resolveCommand(positional);

  if (flags.version) {
    console.log(readVersion());
    return;
  }

  if (!command.name || command.name === 'help' || flags.help) {
    console.log(usage());
    return;
  }

  let response;

  if (command.name === 'examples') {
    console.log(examples());
    return;
  }

  if (command.name === 'doctor') {
    await runDoctor(flags);
    return;
  }

  if (command.name === 'layer') {
    const input = buildMapLayerInput(flags, command.subjectParts, command.layer);
    if (flags.url) {
      console.log(buildMapLayerUrl(flags, input));
      return;
    }
    const client = createClient(flags);
    response = await client.map.layer(input);
  } else {
    throw new Error(`Unknown command: ${process.argv.slice(2).join(' ') || '(empty)'}`);
  }

  printResult(response, flags);
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
