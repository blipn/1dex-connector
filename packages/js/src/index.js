const DEFAULT_BASE_URL = 'https://1dex.fr';
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

export class OneDexApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'OneDexApiError';
    this.status = options.status ?? 0;
    this.body = options.body;
    this.requestId = options.requestId ?? null;
    this.headers = options.headers ?? {};
  }
}

function normalizeBaseUrl(baseUrl) {
  const value = (baseUrl ?? DEFAULT_BASE_URL).trim();
  if (!value) {
    throw new TypeError('baseUrl must not be empty.');
  }
  return value.replace(/\/+$/, '');
}

function normalizeHeaders(headers) {
  if (!headers) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function assertObject(value, name) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
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

function normalizeMapLayer(layer) {
  const normalized = String(layer ?? '').trim();
  const layerKey = PUBLIC_MAP_LAYER_ALIASES[normalized] ?? normalized;
  if (!PUBLIC_MAP_LAYERS.has(layerKey)) {
    throw new TypeError(`Unsupported public map layer: ${normalized || '(empty)'}.`);
  }
  return layerKey;
}

function toMapLayerQuery(input, defaultLayer = 'parcelles') {
  assertObject(input, 'map layer input');
  const {
    address,
    addressSlug,
    address_slug: addressSlugSnake,
    layer,
    layerKey,
    layer_key: layerKeySnake,
    lon,
    lat,
    ...query
  } = input;
  const normalizedLayer = normalizeMapLayer(layer ?? layerKey ?? layerKeySnake ?? defaultLayer);

  if (typeof address === 'string' && address.trim() !== '') {
    return {
      path: `/api/v1/map-layer/${encodeURIComponent(normalizedLayer)}`,
      query: {
        address: address.trim(),
        lon,
        lat,
        ...query,
      },
    };
  }

  if (lon !== undefined && lat !== undefined) {
    return {
      path: `/api/v1/map-layer/${encodeURIComponent(normalizedLayer)}`,
      query: {
        lon,
        lat,
        ...query,
      },
    };
  }

  const slug = addressSlug ?? addressSlugSnake;
  if (typeof slug !== 'string' || slug.trim() === '') {
    throw new TypeError('map layer input requires address, lon/lat, or addressSlug.');
  }
  return {
    path: `/adresse/${encodeURIComponent(slug.trim())}/explore/map-layer/${encodeURIComponent(normalizedLayer)}`,
    query: {
      lon,
      lat,
      ...query,
    },
  };
}

function readRequestId(body, headers) {
  if (body && typeof body === 'object' && typeof body.request_id === 'string') {
    return body.request_id;
  }
  return headers.get('x-request-id') ?? null;
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
      headers: Object.fromEntries(response.headers.entries()),
    });
  }
}

export class OneDexClient {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetch = options.fetch ?? globalThis.fetch;
    this.defaultHeaders = normalizeHeaders(options.headers);
    this.timeoutMs = options.timeoutMs ?? 30_000;

    if (typeof this.fetch !== 'function') {
      throw new TypeError('A fetch implementation is required.');
    }

    this.autocomplete = Object.freeze({
      address: (input, requestOptions) => this.autocompleteAddress(input, requestOptions),
    });
    this.addressPages = Object.freeze({
      state: (slug, requestOptions) => this.addressPageState(slug, requestOptions),
    });
    this.map = Object.freeze({
      parcelles: (input, requestOptions) => this.mapParcelles(input, requestOptions),
      dvf: (input, requestOptions) => this.mapLayer({ ...input, layer: 'parcelles_dvf' }, requestOptions),
      travaux: (input, requestOptions) => this.mapLayer({ ...input, layer: 'parcelles_travaux' }, requestOptions),
      iris: (input, requestOptions) => this.mapLayer({ ...input, layer: 'iris' }, requestOptions),
      context: (input, requestOptions) => this.mapLayer({ ...input, layer: 'context' }, requestOptions),
      labels: (input, requestOptions) => this.mapLayer({ ...input, layer: 'parcelles_labels' }, requestOptions),
      layer: (input, requestOptions) => this.mapLayer(input, requestOptions),
      viewport: (input, requestOptions) => this.mapViewport(input, requestOptions),
    });
    this.overview = Object.freeze({
      address: (input, requestOptions) => this.addressOverview(input, requestOptions),
    });
    this.score = Object.freeze({
      address: (input, requestOptions) => this.scoreAddress(input, requestOptions),
      compare: (input, requestOptions) => this.scoreCompare(input, requestOptions),
      grid: (input, requestOptions) => this.scoreGrid(input, requestOptions),
      addressSuggest: (input, requestOptions) => this.scoreAddressSuggest(input, requestOptions),
    });
  }

  async request(method, path, options = {}) {
    const headers = {
      accept: 'application/json',
      ...this.defaultHeaders,
      ...normalizeHeaders(options.headers),
    };

    let body;
    if (options.body !== undefined) {
      headers['content-type'] = headers['content-type'] ?? 'application/json';
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timer = timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body,
        signal: options.signal ?? controller.signal,
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

    const responseBody = await readJsonResponse(response);
    if (!response.ok) {
      const requestId = readRequestId(responseBody, response.headers);
      const warning = Array.isArray(responseBody?.warnings) ? responseBody.warnings[0] : undefined;
      const message = warning?.message ?? responseBody?.message ?? `1dex API request failed with HTTP ${response.status}.`;
      throw new OneDexApiError(message, {
        status: response.status,
        body: responseBody,
        requestId,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    return responseBody;
  }

  autocompleteAddress(input, options = {}) {
    assertObject(input, 'autocomplete input');
    const { q, ...query } = input;
    if (typeof q !== 'string' || q.trim() === '') {
      throw new TypeError('autocomplete input requires q.');
    }
    return this.request('GET', appendQuery('/api/v1/autocomplete/address', { q: q.trim(), ...query }), options);
  }

  addressPageState(slug, options = {}) {
    if (typeof slug !== 'string' || slug.trim() === '') {
      throw new TypeError('address page state requires slug.');
    }
    return this.request('GET', `/api/v1/address-pages/${encodeURIComponent(slug.trim())}/state`, options);
  }

  mapParcelles(input, options = {}) {
    const { path, query } = toMapLayerQuery(input, 'parcelles');
    return this.request('GET', appendQuery(path, query), options);
  }

  mapLayer(input, options = {}) {
    const { path, query } = toMapLayerQuery(input);
    return this.request('GET', appendQuery(path, query), options);
  }

  mapViewport(input, options = {}) {
    assertObject(input, 'map viewport input');
    const { address, lon, lat, layers, ...query } = input;
    if (typeof layers !== 'string' || layers.trim() === '') {
      throw new TypeError('map viewport input requires layers.');
    }
    if ((typeof address !== 'string' || address.trim() === '') && (lon === undefined || lat === undefined)) {
      throw new TypeError('map viewport input requires address or lon/lat.');
    }
    return this.request('GET', appendQuery('/api/v1/map-viewport', {
      address: typeof address === 'string' && address.trim() !== '' ? address.trim() : undefined,
      lon,
      lat,
      layers: layers.trim(),
      ...query,
    }), options);
  }

  addressOverview(input, options = {}) {
    assertObject(input, 'address overview input');
    return this.request('GET', appendQuery('/api/v1/address-overview', input), options);
  }

  scoreAddress(input, options = {}) {
    assertObject(input, 'score address input');
    return this.request('POST', '/api/v1/score/address', { ...options, body: input });
  }

  scoreCompare(input, options = {}) {
    assertObject(input, 'score compare input');
    return this.request('POST', '/api/v1/score/compare', { ...options, body: input });
  }

  scoreGrid(input, options = {}) {
    assertObject(input, 'score grid input');
    return this.request('GET', appendQuery('/api/v1/score/grid', input), options);
  }

  scoreAddressSuggest(input, options = {}) {
    assertObject(input, 'score address suggest input');
    const { q, ...query } = input;
    if (typeof q !== 'string' || q.trim() === '') {
      throw new TypeError('score address suggest input requires q.');
    }
    return this.request('GET', appendQuery('/api/v1/score/address-suggest', { q: q.trim(), ...query }), options);
  }
}
