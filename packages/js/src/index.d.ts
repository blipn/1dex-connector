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

export type PublicMapLayerKey =
  | 'context'
  | 'iris'
  | 'parcelles'
  | 'parcelles_dvf'
  | 'parcelles_travaux'
  | 'parcelles_labels'
  | 'dvf'
  | 'travaux'
  | 'labels';

export interface MapLayerInput extends MapParcellesInput {
  layer?: PublicMapLayerKey;
  layerKey?: PublicMapLayerKey;
  layer_key?: PublicMapLayerKey;
}

export interface AddressOverviewInput {
  address?: string;
  city_code?: string;
  lon?: number;
  lat?: number;
  parcel_record_key?: string;
  dvf_radius_m?: number;
  dvf_year?: number;
  dvf_date_min?: string;
  dvf_date_max?: string;
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
    dvf(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    travaux(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    iris(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    context(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    layer(input: MapLayerInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  readonly overview: {
    address(input: AddressOverviewInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  request<T = unknown>(method: string, path: string, options?: OneDexRequestOptions): Promise<T>;
  mapParcelles(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapLayer(input: MapLayerInput, options?: OneDexRequestOptions): Promise<unknown>;
  addressOverview(input: AddressOverviewInput, options?: OneDexRequestOptions): Promise<unknown>;
}
