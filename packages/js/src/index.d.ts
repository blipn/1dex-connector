export interface OneDexRequestOptions {
  headers?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
  signal?: AbortSignal;
  body?: unknown;
}

export interface MapParcellesInput {
  address?: string;
  addressSlug?: string;
  address_slug?: string;
  city_code?: string;
  lon?: number;
  lat?: number;
  viewport_bbox?: string;
  viewport_zoom?: number;
  viewport_render_mode?: 'features' | string;
  [key: string]: unknown;
}

export class OneDexApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly requestId: string | null;
  readonly headers: Record<string, string>;
}

export class OneDexClient {
  constructor(options?: {
    baseUrl?: string;
    headers?: Record<string, string | number | boolean | null | undefined>;
    timeoutMs?: number;
    fetch?: typeof fetch;
  });

  readonly baseUrl: string;
  readonly timeoutMs: number;

  readonly map: {
    parcelles(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  request<T = unknown>(method: string, path: string, options?: OneDexRequestOptions): Promise<T>;
  mapParcelles(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
}
