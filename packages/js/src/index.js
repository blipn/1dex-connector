const DEFAULT_BASE_URL = 'https://api.1dex.fr';

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

function toResolvePayload(input) {
  if (typeof input === 'string') {
    return { address: input };
  }
  assertObject(input, 'resolve input');
  return input;
}

function toSourcesPayload(input) {
  if (typeof input === 'string') {
    return { address: input };
  }
  assertObject(input, 'sources input');
  return input;
}

function toAutocompleteQuery(input, options) {
  if (typeof input === 'string') {
    return {
      q: input,
      ...(options?.limit === undefined ? {} : { limit: options.limit }),
    };
  }
  assertObject(input, 'autocomplete input');
  return input;
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
  } catch (error) {
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
    this.apiKey = options.apiKey;
    this.fetch = options.fetch ?? globalThis.fetch;
    this.defaultHeaders = normalizeHeaders(options.headers);
    this.timeoutMs = options.timeoutMs ?? 30_000;

    if (typeof this.fetch !== 'function') {
      throw new TypeError('A fetch implementation is required.');
    }

    this.address = Object.freeze({
      autocomplete: (input, requestOptions) => this.addressAutocomplete(input, requestOptions),
      resolve: (input, requestOptions) => this.addressResolve(input, requestOptions),
      sources: (input, requestOptions) => this.addressSources(input, requestOptions),
    });
    this.source = Object.freeze({
      query: (sourceKey, input, requestOptions) => this.sourceQuery(sourceKey, input, requestOptions),
    });
    this.datasets = Object.freeze({
      list: (requestOptions) => this.datasetsList(requestOptions),
    });
  }

  async request(method, path, options = {}) {
    const headers = {
      accept: 'application/json',
      ...this.defaultHeaders,
      ...normalizeHeaders(options.headers),
    };

    if (this.apiKey && !headers.authorization) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

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

  addressAutocomplete(input, options = {}) {
    const query = toAutocompleteQuery(input, options);
    return this.request('GET', appendQuery('/v1/address/autocomplete', query), options);
  }

  addressResolve(input, options = {}) {
    return this.request('POST', '/v1/address/resolve', {
      ...options,
      body: toResolvePayload(input),
    });
  }

  addressSources(input, options = {}) {
    return this.request('POST', '/v1/address/sources', {
      ...options,
      body: toSourcesPayload(input),
    });
  }

  sourceQuery(sourceKey, input, options = {}) {
    if (typeof sourceKey !== 'string' || sourceKey.trim().length === 0) {
      throw new TypeError('sourceKey must be a non-empty string.');
    }
    assertObject(input, 'source query input');
    return this.request('POST', `/v1/address/sources/${encodeURIComponent(sourceKey.trim())}`, {
      ...options,
      body: input,
    });
  }

  datasetsList(options = {}) {
    return this.request('GET', '/v1/datasets', options);
  }
}
