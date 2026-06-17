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

export interface AddressLocatorInput {
  address?: string;
  city_code?: string;
  cityCode?: string;
  lon?: number;
  lat?: number;
  parcel_record_key?: string;
  parcelRecordKey?: string;
  normalized_address_key?: string;
  normalizedAddressKey?: string;
  [key: string]: unknown;
}

export interface AddressDetailsInput extends AddressLocatorInput {
  fields: string | string[];
  dvf_radius_m?: number;
  dvf_year?: number;
  dvf_date_min?: string;
  dvf_date_max?: string;
  dvf_type?: 'appartement' | 'maison' | 'terrain' | 'local' | 'mixte' | string;
  dvf_surface_min?: number;
  dvf_surface_max?: number;
  dvf_price_min?: number;
  dvf_price_max?: number;
  dvf_price_m2_min?: number;
  dvf_price_m2_max?: number;
}

export type AddressUnlockInput = AddressLocatorInput;

export type AddressDetailsField =
  | 'summary'
  | 'rail'
  | 'mobile'
  | 'tabs'
  | 'map_layers'
  | 'parcel_dvf'
  | 'sources'
  | 'source_outcomes';

export type AddressUnlockLocatorKind = 'normalized_address_key' | 'resolved_locator' | 'unavailable';
export type AddressUnlockFollowUpLocatorKind = 'normalized_address_key' | 'unlock_request' | 'unavailable';
export type AddressUnlockStatus = 'already_active' | 'unlocked' | 'insufficient_credits';
export type AddressUnlockPreviewStatus = 'already_active' | 'available' | 'insufficient_credits';
export type AddressCreditSourceKind = 'free_credit' | 'subscription_credit' | 'pack_credit' | 'report_order' | 'legacy_migration';

export interface AddressAccessGrant {
  address_access_grant_id: string;
  normalized_address_key: string;
  source_kind: AddressCreditSourceKind;
  source_label: string;
  starts_at: string;
  expires_at: string;
  order_id: string | null;
  unlock_credit_pool_id: string | null;
  resolved_label: string | null;
  canonical_slug: string | null;
  [key: string]: unknown;
}

export interface AddressUnlockPreview {
  status: AddressUnlockPreviewStatus;
  credits_required: 0 | 1;
  remaining_credits: number | null;
  source_kind: AddressCreditSourceKind | null;
  source_label: string | null;
  access_expires_at: string | null;
  active_grant: AddressAccessGrant | null;
  [key: string]: unknown;
}

export interface AddressUnlockResult {
  normalized_address_key: string;
  status: AddressUnlockStatus;
  grant: AddressAccessGrant | null;
  [key: string]: unknown;
}

export interface AddressDetailsResponse {
  version: 'address-details-v1';
  fields: AddressDetailsField[];
  query: Record<string, unknown>;
  resolved: Record<string, unknown>;
  degraded: Record<string, unknown>;
  summaryCards?: Record<string, unknown>[];
  utilityRailCards?: Record<string, unknown>[];
  mobilePriorityCards?: Record<string, unknown>[];
  tabs?: Record<string, unknown>[];
  mapLayers?: Record<string, unknown>[];
  parcelDvfHistory?: Record<string, unknown> | null;
  directSources?: Record<string, unknown>;
  aggregateSources?: Record<string, unknown>;
  sourceOutcomes?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface AddressUnlockResponse {
  version: 'address-unlock-v1';
  normalized_address_key: string;
  resolved: Record<string, unknown> | null;
  result: AddressUnlockResult | null;
  details_url: string | null;
  details_locator_kind: AddressUnlockLocatorKind;
  [key: string]: unknown;
}

export interface AddressUnlockRequiredBody {
  error: 'address_unlock_required';
  message: string;
  normalized_address_key: string | null;
  unlock_locator_kind: AddressUnlockFollowUpLocatorKind;
  unlock_request?: AddressUnlockInput;
  unlock_preview: AddressUnlockPreview;
  [key: string]: unknown;
}

export interface UsageWindow {
  limit: number;
  used: number;
  remaining: number;
}

export interface UsagePointSnapshot {
  scope: string;
  label: string;
  minute: UsageWindow;
  hour: UsageWindow;
  day: UsageWindow;
  [key: string]: unknown;
}

export interface UnlockCreditPool {
  unlock_credit_pool_id: string;
  pool_kind: 'free_intro_pack' | 'subscription_cycle' | 'exploration_pack' | 'agency_bonus' | string;
  status: 'active' | 'expired' | 'revoked' | string;
  total_credits: number;
  remaining_credits: number;
  starts_at: string;
  expires_at: string;
  order_id: string | null;
  subscription_charge_id: string | null;
  source_label: string;
  [key: string]: unknown;
}

export interface ReportCreditPool {
  report_credit_pool_id: string;
  status: 'active' | 'expired' | 'revoked' | string;
  total_credits: number;
  remaining_credits: number;
  starts_at: string;
  expires_at: string;
  source_kind: 'admin_grant' | string;
  source_label: string;
  [key: string]: unknown;
}

export interface AddressCreditConsumption {
  unlock_credit_consumption_id: string;
  normalized_address_key: string;
  consumed_at: string;
  source_label: string;
  resolved_label: string | null;
  canonical_slug: string | null;
  [key: string]: unknown;
}

export interface AddressAccessSubscription {
  subscription_id: string;
  plan_key: string;
  offer_key: string | null;
  status: 'incomplete' | 'active' | 'past_due' | 'canceled' | 'ended' | 'unpaid' | string;
  is_gift: boolean;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ended_at: string | null;
  current_credit_pool: UnlockCreditPool | null;
  next_reset_at: string | null;
  [key: string]: unknown;
}

export interface AccountUsageResponse {
  version: 'account-usage-v1';
  api_points: UsagePointSnapshot[];
  credits: {
    total_remaining: number;
    pools: UnlockCreditPool[];
    report_pools: ReportCreditPool[];
    active_grants: AddressAccessGrant[];
    recent_consumptions: AddressCreditConsumption[];
    [key: string]: unknown;
  };
  subscription: AddressAccessSubscription | null;
  [key: string]: unknown;
}

export interface CommuneSearchInput {
  q: string;
  limit?: number;
  [key: string]: unknown;
}

export interface PublicPreviewInput {
  path: string;
}

export interface MapFocusParcelleInput {
  record_key?: string;
  recordKey?: string;
}

export interface MapFocusParcellesInput {
  record_keys?: string | string[];
  recordKeys?: string | string[];
}

export interface MapFocusAddressInput {
  address: string;
  city_code?: string;
  cityCode?: string;
  [key: string]: unknown;
}

export interface MapFocusPublicLocationInput {
  lon: number;
  lat: number;
  [key: string]: unknown;
}

export interface MapFocusFeatureInput {
  layer?: string;
  layer_key?: string;
  layerKey?: string;
  feature_key?: string;
  featureKey?: string;
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
    apiKey?: string;
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

  readonly address: {
    details(input: AddressDetailsInput, options?: OneDexRequestOptions): Promise<AddressDetailsResponse>;
    unlock(input: AddressUnlockInput, options?: OneDexRequestOptions): Promise<AddressUnlockResponse>;
  };

  readonly account: {
    usage(options?: OneDexRequestOptions): Promise<AccountUsageResponse>;
  };

  readonly communes: {
    search(input: CommuneSearchInput, options?: OneDexRequestOptions): Promise<unknown>;
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
    focus: {
      parcelle(input: MapFocusParcelleInput, options?: OneDexRequestOptions): Promise<unknown>;
      parcelles(input: MapFocusParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
      address(input: MapFocusAddressInput, options?: OneDexRequestOptions): Promise<unknown>;
      publicLocation(input: MapFocusPublicLocationInput, options?: OneDexRequestOptions): Promise<unknown>;
      feature(input: MapFocusFeatureInput, options?: OneDexRequestOptions): Promise<unknown>;
    };
  };

  readonly overview: {
    address(input: AddressOverviewInput, options?: OneDexRequestOptions): Promise<unknown>;
  };

  readonly preview: {
    byPath(input: string | PublicPreviewInput, options?: OneDexRequestOptions): Promise<unknown>;
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
  addressDetails(input: AddressDetailsInput, options?: OneDexRequestOptions): Promise<AddressDetailsResponse>;
  addressUnlock(input: AddressUnlockInput, options?: OneDexRequestOptions): Promise<AddressUnlockResponse>;
  accountUsage(options?: OneDexRequestOptions): Promise<AccountUsageResponse>;
  communeSearch(input: CommuneSearchInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapParcelles(input: MapParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapLayer(input: MapLayerInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapViewport(input: MapViewportInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapFocusParcelle(input: MapFocusParcelleInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapFocusParcelles(input: MapFocusParcellesInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapFocusAddress(input: MapFocusAddressInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapFocusPublicLocation(input: MapFocusPublicLocationInput, options?: OneDexRequestOptions): Promise<unknown>;
  mapFocusFeature(input: MapFocusFeatureInput, options?: OneDexRequestOptions): Promise<unknown>;
  addressOverview(input: AddressOverviewInput, options?: OneDexRequestOptions): Promise<unknown>;
  publicPreview(input: string | PublicPreviewInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreAddress(input: ScoreAddressInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreCompare(input: ScoreCompareInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreGrid(input: ScoreGridInput, options?: OneDexRequestOptions): Promise<unknown>;
  scoreAddressSuggest(input: ScoreAddressSuggestInput, options?: OneDexRequestOptions): Promise<unknown>;
}
