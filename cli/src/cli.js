#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const DEFAULT_BASE_URL = 'https://1dex.fr';
const SUPPORTED_FORMATS = new Set(['json', 'csv', 'summary']);
const FLAG_ALIASES = Object.freeze({
  a: 'address',
  b: 'viewport-bbox',
  f: 'format',
  h: 'help',
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
      throw error;
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
    const { address, ...query } = input;
    if (typeof address !== 'string' || !address.trim()) {
      throw new TypeError('parcelles input requires address.');
    }
    const path = appendQuery('/explore/map-layer/parcelles', {
      address: address.trim(),
      ...query,
    });
    return this.request('GET', path);
  }
}

function usage() {
  return `1dex CLI

Usage:
  1dex map parcelles <address> [options]
  1dex map parcelles --address <address> [options]

Options:
  -a, --address <text>                 Address to resolve. Overrides positional address.
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

function buildParcellesInput(flags, subjectParts) {
  const address = String(flags.address ?? subjectParts.join(' ')).trim();
  if (!address) {
    throw new Error('Missing address. Use positional text or --address <text>.');
  }
  return {
    address,
    city_code: flags['city-code'],
    lon: readOptionalNumber(flags.lon, 'lon'),
    lat: readOptionalNumber(flags.lat, 'lat'),
    viewport_bbox: flags['viewport-bbox'],
    viewport_zoom: readOptionalNumber(flags['viewport-zoom'], 'viewport-zoom'),
    viewport_render_mode: flags['viewport-render-mode'] ?? 'features',
  };
}

function buildParcellesUrl(flags, input) {
  const baseUrl = normalizeBaseUrl(flags['base-url'] ?? process.env.ONEDEX_BASE_URL);
  return `${baseUrl}${appendQuery('/explore/map-layer/parcelles', input)}`;
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

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [resource, action, ...subjectParts] = positional;

  if (flags.version) {
    console.log(readVersion());
    return;
  }

  if (!resource || flags.help) {
    console.log(usage());
    return;
  }

  const client = createClient(flags);
  let response;

  if (resource === 'map' && action === 'parcelles') {
    const input = buildParcellesInput(flags, subjectParts);
    if (flags.url) {
      console.log(buildParcellesUrl(flags, input));
      return;
    }
    response = await client.map.parcelles(input);
  } else {
    throw new Error(`Unknown command: ${process.argv.slice(2).join(' ')}`);
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
  }
  process.exitCode = 1;
});
