export type OneDexResponseStatus = 'ok' | 'empty' | 'error';

export type OneDexSourceMethod = 'internal_component' | 'preloaded_import' | 'live_adapter' | 'mixed';

export interface OneDexWarning {
  code: string;
  message: string;
  field?: string;
}

export interface OneDexPagination {
  page: number;
  page_size: number;
  total_items: number | null;
  total_pages: number | null;
  has_next_page: boolean;
}

export interface OneDexQuery {
  normalized_address: Record<string, unknown> | null;
  match_score: number | null;
  [key: string]: unknown;
}

export interface OneDexSource {
  source_key: string;
  dataset_updated_at: string | null;
  method: OneDexSourceMethod;
  limitations: string[];
  [key: string]: unknown;
}

export interface OneDexMeta {
  pagination: OneDexPagination | null;
  [key: string]: unknown;
}

export interface OneDexResponse<TData = unknown, TQuery extends OneDexQuery = OneDexQuery> {
  request_id: string;
  query: TQuery;
  status: OneDexResponseStatus;
  source: OneDexSource;
  data: TData;
  warnings: OneDexWarning[];
  meta: OneDexMeta;
}

export interface OneDexCoordinates {
  lon: number;
  lat: number;
}

export interface AddressResolveInput {
  address?: string;
  coordinates?: OneDexCoordinates;
  response_mode?: 'documentation' | 'simplified';
  response_documentation?: boolean;
  response_simplified?: boolean;
  [key: string]: unknown;
}

export interface AddressAutocompleteInput {
  q: string;
  limit?: number;
}

export interface AddressSourcesInput {
  address?: string;
  coordinates?: OneDexCoordinates;
  source_keys?: string[];
  source_overrides?: Record<string, Record<string, unknown>>;
  response_mode?: 'documentation' | 'simplified';
  response_documentation?: boolean;
  response_simplified?: boolean;
  [key: string]: unknown;
}

export interface OneDexRequestOptions {
  headers?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
  signal?: AbortSignal;
  body?: unknown;
  limit?: number;
}

export interface OneDexClientOptions {
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class OneDexApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly requestId: string | null;
  readonly headers: Record<string, string>;
}

export class OneDexClient {
  constructor(options?: OneDexClientOptions);

  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly timeoutMs: number;

  readonly address: {
    autocomplete(input: string | AddressAutocompleteInput, options?: OneDexRequestOptions): Promise<OneDexResponse>;
    resolve(input: string | AddressResolveInput, options?: OneDexRequestOptions): Promise<OneDexResponse>;
    sources(input: string | AddressSourcesInput, options?: OneDexRequestOptions): Promise<OneDexResponse>;
  };

  readonly source: {
    query(sourceKey: string, input: Record<string, unknown>, options?: OneDexRequestOptions): Promise<OneDexResponse>;
  };

  readonly datasets: {
    list(options?: OneDexRequestOptions): Promise<unknown>;
  };

  request<T = unknown>(method: string, path: string, options?: OneDexRequestOptions): Promise<T>;
  addressAutocomplete(input: string | AddressAutocompleteInput, options?: OneDexRequestOptions): Promise<OneDexResponse>;
  addressResolve(input: string | AddressResolveInput, options?: OneDexRequestOptions): Promise<OneDexResponse>;
  addressSources(input: string | AddressSourcesInput, options?: OneDexRequestOptions): Promise<OneDexResponse>;
  sourceQuery(sourceKey: string, input: Record<string, unknown>, options?: OneDexRequestOptions): Promise<OneDexResponse>;
  datasetsList(options?: OneDexRequestOptions): Promise<unknown>;
}
