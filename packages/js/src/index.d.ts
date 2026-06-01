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
  cityCode?: string;
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

export interface MapViewportInput {
  layers: string;
  address?: string;
  city_code?: string;
  cityCode?: string;
  lon?: number;
  lat?: number;
  [key: string]: unknown;
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

export interface AutocompleteAddressInput {
  q: string;
  limit?: number;
  [key: string]: unknown;
}

export type ScoreCategory = 'global' | 'market' | 'daily_life' | 'environment' | 'vigilance' | 'potential' | 'price_m2';

export interface ScoreAddressItem {
  id?: string;
  address?: string;
  lat?: number;
  lng?: number;
  lon?: number;
  [key: string]: unknown;
}

export interface ScoreAddressInput {
  items: ScoreAddressItem[];
  profile?: string;
  [key: string]: unknown;
}

export interface ScoreCompareInput extends ScoreAddressInput {
  sortBy?: Exclude<ScoreCategory, 'price_m2'>;
}

export interface ScoreGridInput {
  bbox: string;
  zoom: number;
  category?: ScoreCategory;
  [key: string]: unknown;
}

export interface ScoreAddressSuggestInput {
  q: string;
  limit?: number;
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

  readonly autocomplete: {
    address(input: AutocompleteAddressInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  readonly addressPages: {
    state(slug: string, options?: OneDexRequestOptions): Promise<unknown>;
  };

  readonly map: {
    parcelles(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    dvf(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    travaux(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    iris(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    context(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    labels(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
    layer(input: MapLayerInput, options?: OneDexRequestOptions): Promise<unknown>;
    viewport(input: MapViewportInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  readonly overview: {
    address(input: AddressOverviewInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  readonly score: {
    address(input: ScoreAddressInput, options?: OneDexRequestOptions): Promise<unknown>;
    compare(input: ScoreCompareInput, options?: OneDexRequestOptions): Promise<unknown>;
    grid(input: ScoreGridInput, options?: OneDexRequestOptions): Promise<unknown>;
    addressSuggest(input: ScoreAddressSuggestInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  request<T = unknown>(method: string, path: string, options?: OneDexRequestOptions): Promise<T>;
  autocompleteAddress(input: AutocompleteAddressInput, options?: OneDexRequestOptions): Promise<unknown>;
  addressPageState(slug: string, options?: OneDexRequestOptions): Promise<unknown>;
  mapParcelles(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapLayer(input: MapLayerInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapViewport(input: MapViewportInput, options?: OneDexRequestOptions): Promise<unknown>;
  addressOverview(input: AddressOverviewInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreAddress(input: ScoreAddressInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreCompare(input: ScoreCompareInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreGrid(input: ScoreGridInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreAddressSuggest(input: ScoreAddressSuggestInput, options?: OneDexRequestOptions): Promise<unknown>;
}
