import { OneDexClient, type AccountUsageV2Response, type AddressUnlockRequiredBody } from '../src/index.js';

const client = new OneDexClient({ baseUrl: 'https://1dex.fr/api/v1', retry: { maxAttempts: 2, maxDelayMs: 5000 } });
client.address.details({ address: 'fixture', fields: ['summary'], idempotencyKey: 'read-1' });
client.address.details({ address: 'fixture', fields: ['summary'] }, { idempotencyKey: 'read-1' });
client.addressDetails({ address: 'fixture', fields: ['summary'] }, { idempotencyKey: 'read-1' });
client.address.unlock({ address: 'fixture', idempotency_key: 'unlock-1' });
client.address.unlock({ address: 'fixture' }, { idempotencyKey: 'unlock-1' });
client.addressUnlock({ address: 'fixture' }, { idempotencyKey: 'unlock-1' });
// @ts-expect-error Every detailed read needs an explicit idempotency key.
client.address.details({ address: 'fixture', fields: ['summary'] });
// @ts-expect-error Every unlock needs an explicit idempotency key.
client.address.unlock({ address: 'fixture' });

const legacyLive: AccountUsageV2Response = {
  version: 'account-usage-v2',
  api_addresses: {
    plan_key: 'essential', plan_label: 'API Essentiel',
    day: { used: 1, limit: 100, reset_at: '2026-09-08T00:00:00Z' },
    month: { used: 1, limit: 1000, reset_at: '2026-10-01T00:00:00Z' },
  },
};
const demo: AccountUsageV2Response = {
  version: 'account-usage-v2',
  api_addresses: {
    plan_key: 'demo', plan_label: 'API Démonstration', as_of: '2026-09-07T14:00:00Z',
    demo_window: {
      normalized_address_key: 'fixture', policy_version: 1, reads_used: 0,
      reads_limit: 25, reads_available: 25, window_seconds: 3600, next_read_expires_at: null,
    },
  },
};
const locked: AddressUnlockRequiredBody = {
  error: 'address_unlock_required', normalized_address_key: 'fixture', unlock_locator_kind: 'normalized_address_key',
};
void [legacyLive, demo, locked];
