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

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function hasCoordinates(query) {
  return query.lon !== undefined && query.lon !== null && query.lat !== undefined && query.lat !== null;
}

function hasAddressLocator(query) {
  return (
    (typeof query.address === 'string' && query.address.trim() !== '')
    || (typeof query.normalized_address_key === 'string' && query.normalized_address_key.trim() !== '')
    || (typeof query.parcel_record_key === 'string' && query.parcel_record_key.trim() !== '')
    || hasCoordinates(query)
  );
}

function hasNormalizedAddressKey(query) {
  return typeof query.normalized_address_key === 'string' && query.normalized_address_key.trim() !== '';
}

function hasResolvedAddressLocator(query) {
  return (
    (typeof query.address === 'string' && query.address.trim() !== '')
    || (typeof query.parcel_record_key === 'string' && query.parcel_record_key.trim() !== '')
    || hasCoordinates(query)
  );
}

function assertNormalizedAddressKeyIsAlone(query, name) {
  if (hasNormalizedAddressKey(query) && (hasResolvedAddressLocator(query) || query.city_code)) {
    throw new TypeError(`${name} must use normalizedAddressKey alone, without address, cityCode, parcelRecordKey, or lon/lat.`);
  }
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

function normalizeCsvList(value, name) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    if (items.length === 0) {
      throw new TypeError(`${name} must not be empty.`);
    }
    return items.join(',');
  }
  return assertNonEmptyString(value, name);
}

function normalizeApiKeyHeader(apiKey) {
  if (apiKey === undefined || apiKey === null || String(apiKey).trim() === '') {
    return {};
  }
  return { authorization: `Bearer ${String(apiKey).trim()}` };
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
    city_code: cityCodeSnake,
    cityCode: cityCodeCamel,
    layer,
    layerKey,
    layer_key: layerKeySnake,
    lon,
    lat,
    ...query
  } = input;
  const normalizedLayer = normalizeMapLayer(layer ?? layerKey ?? layerKeySnake ?? defaultLayer);

  const cityCode = cityCodeSnake ?? cityCodeCamel;
  if (typeof address === 'string' && address.trim() !== '') {
    return {
      path: `/api/v1/map-layer/${encodeURIComponent(normalizedLayer)}`,
      query: {
        address: address.trim(),
        city_code: cityCode,
        lon,
        lat,
        ...query,
      },
    };
  }

  if ((lon !== undefined && lat !== undefined) || (typeof cityCode === 'string' && cityCode.trim() !== '')) {
    return {
      path: `/api/v1/map-layer/${encodeURIComponent(normalizedLayer)}`,
      query: {
        city_code: typeof cityCode === 'string' && cityCode.trim() !== '' ? cityCode.trim() : undefined,
        lon,
        lat,
        ...query,
      },
    };
  }

  const slug = addressSlug ?? addressSlugSnake;
  if (typeof slug !== 'string' || slug.trim() === '') {
    throw new TypeError('map layer input requires address, city_code, lon/lat, or addressSlug.');
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
    this.defaultHeaders = {
      ...normalizeApiKeyHeader(options.apiKey),
      ...normalizeHeaders(options.headers),
    };
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
    this.address = Object.freeze({
      details: (input, requestOptions) => this.addressDetails(input, requestOptions),
      unlock: (input, requestOptions) => this.addressUnlock(input, requestOptions),
    });
    this.account = Object.freeze({
      usage: (requestOptions) => this.accountUsage(requestOptions),
    });
    this.communes = Object.freeze({
      search: (input, requestOptions) => this.communeSearch(input, requestOptions),
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
      focus: Object.freeze({
        parcelle: (input, requestOptions) => this.mapFocusParcelle(input, requestOptions),
        parcelles: (input, requestOptions) => this.mapFocusParcelles(input, requestOptions),
        address: (input, requestOptions) => this.mapFocusAddress(input, requestOptions),
        publicLocation: (input, requestOptions) => this.mapFocusPublicLocation(input, requestOptions),
        feature: (input, requestOptions) => this.mapFocusFeature(input, requestOptions),
      }),
    });
    this.overview = Object.freeze({
      address: (input, requestOptions) => this.addressOverview(input, requestOptions),
    });
    this.preview = Object.freeze({
      byPath: (input, requestOptions) => this.publicPreview(input, requestOptions),
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

  addressDetails(input, options = {}) {
    assertObject(input, 'address details input');
    const { fields, ...locatorInput } = input;
    const query = normalizeAddressLocator(locatorInput);
    const normalizedFields = normalizeCsvList(fields, 'address details fields');
    assertNormalizedAddressKeyIsAlone(query, 'address details input');
    if (!hasAddressLocator(query)) {
      throw new TypeError('address details input requires address, normalizedAddressKey, parcelRecordKey, or lon/lat.');
    }
    return this.request('GET', appendQuery('/api/v1/address-details', {
      ...query,
      fields: normalizedFields,
    }), options);
  }

  addressUnlock(input, options = {}) {
    assertObject(input, 'address unlock input');
    const body = normalizeAddressLocator(input);
    assertNormalizedAddressKeyIsAlone(body, 'address unlock input');
    if (!hasAddressLocator(body)) {
      throw new TypeError('address unlock input requires address, normalizedAddressKey, parcelRecordKey, or lon/lat.');
    }
    return this.request('POST', '/api/v1/address-unlocks', { ...options, body });
  }

  accountUsage(options = {}) {
    return this.request('GET', '/api/v1/account/usage', options);
  }

  communeSearch(input, options = {}) {
    assertObject(input, 'commune search input');
    const { q, ...query } = input;
    return this.request('GET', appendQuery('/api/v1/communes/search', {
      q: assertNonEmptyString(q, 'commune search q'),
      ...query,
    }), options);
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
    const { address, city_code: cityCodeSnake, cityCode: cityCodeCamel, lon, lat, layers, ...query } = input;
    if (typeof layers !== 'string' || layers.trim() === '') {
      throw new TypeError('map viewport input requires layers.');
    }
    const cityCode = cityCodeSnake ?? cityCodeCamel;
    if ((typeof address !== 'string' || address.trim() === '') && (lon === undefined || lat === undefined) && (typeof cityCode !== 'string' || cityCode.trim() === '')) {
      throw new TypeError('map viewport input requires address, city_code, or lon/lat.');
    }
    return this.request('GET', appendQuery('/api/v1/map-viewport', {
      address: typeof address === 'string' && address.trim() !== '' ? address.trim() : undefined,
      city_code: typeof cityCode === 'string' && cityCode.trim() !== '' ? cityCode.trim() : undefined,
      lon,
      lat,
      layers: layers.trim(),
      ...query,
    }), options);
  }

  mapFocusParcelle(input, options = {}) {
    assertObject(input, 'map focus parcelle input');
    const recordKey = input.record_key ?? input.recordKey;
    return this.request('GET', appendQuery('/api/v1/map-focus/parcelle', {
      record_key: assertNonEmptyString(recordKey, 'map focus parcelle record_key'),
    }), options);
  }

  mapFocusParcelles(input, options = {}) {
    assertObject(input, 'map focus parcelles input');
    const recordKeys = input.record_keys ?? input.recordKeys;
    return this.request('GET', appendQuery('/api/v1/map-focus/parcelles', {
      record_keys: normalizeCsvList(recordKeys, 'map focus parcelles record_keys'),
    }), options);
  }

  mapFocusAddress(input, options = {}) {
    assertObject(input, 'map focus address input');
    const { address, city_code: cityCodeSnake, cityCode: cityCodeCamel, ...query } = input;
    return this.request('GET', appendQuery('/api/v1/map-focus/address', {
      address: assertNonEmptyString(address, 'map focus address'),
      city_code: cityCodeSnake ?? cityCodeCamel,
      ...query,
    }), options);
  }

  mapFocusPublicLocation(input, options = {}) {
    assertObject(input, 'map focus public location input');
    const { lon, lat, ...query } = input;
    if (lon === undefined || lon === null || lat === undefined || lat === null) {
      throw new TypeError('map focus public location input requires lon and lat.');
    }
    return this.request('GET', appendQuery('/api/v1/map-focus/public-location', {
      lon,
      lat,
      ...query,
    }), options);
  }

  mapFocusFeature(input, options = {}) {
    assertObject(input, 'map focus feature input');
    const layerKey = input.layer_key ?? input.layerKey ?? input.layer;
    const featureKey = input.feature_key ?? input.featureKey;
    return this.request('GET', appendQuery('/api/v1/map-focus/feature', {
      layer_key: assertNonEmptyString(layerKey, 'map focus feature layer_key'),
      feature_key: assertNonEmptyString(featureKey, 'map focus feature feature_key'),
    }), options);
  }

  addressOverview(input, options = {}) {
    assertObject(input, 'address overview input');
    return this.request('GET', appendQuery('/api/v1/address-overview', input), options);
  }

  publicPreview(input, options = {}) {
    const path = typeof input === 'string' ? input : input?.path;
    return this.request('GET', appendQuery('/api/v1/public-preview', {
      path: assertNonEmptyString(path, 'public preview path'),
    }), options);
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
