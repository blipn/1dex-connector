#!/usr/bin/env node
const DEFAULT_BASE_URL = 'https://1dex.fr';

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

  async request(method, path, options = {}) {
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
    return this.request('GET', appendQuery('/explore/map-layer/parcelles', {
      address: address.trim(),
      ...query,
    }));
  }
}

function usage() {
  return `1dex CLI

Usage:
  1dex map parcelles <address> [--viewport-bbox <bbox>] [--viewport-zoom <n>] [--viewport-render-mode features]

Environment:
  ONEDEX_BASE_URL (defaults to https://1dex.fr)
`;
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positional, flags };
}

function createClient(flags) {
  return new OneDexClient({
    baseUrl: flags['base-url'] ?? process.env.ONEDEX_BASE_URL,
  });
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

function printResult(response, flags) {
  if ((flags.format ?? 'json') === 'csv') {
    printCsv(response);
    return;
  }
  console.log(JSON.stringify(response, null, 2));
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [resource, action, ...subjectParts] = positional;

  if (!resource || flags.help) {
    console.log(usage());
    return;
  }

  const client = createClient(flags);
  let response;

  if (resource === 'map' && action === 'parcelles') {
    const address = subjectParts.join(' ').trim();
    if (!address) {
      throw new Error('Missing address.');
    }
    response = await client.map.parcelles({
      address,
      city_code: flags['city-code'],
      lon: flags.lon ? Number(flags.lon) : undefined,
      lat: flags.lat ? Number(flags.lat) : undefined,
      viewport_bbox: flags['viewport-bbox'],
      viewport_zoom: flags['viewport-zoom'] ? Number(flags['viewport-zoom']) : undefined,
      viewport_render_mode: flags['viewport-render-mode'] ?? 'features',
    });
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
