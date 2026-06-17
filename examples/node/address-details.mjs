import { OneDexApiError, OneDexClient } from '../../packages/js/src/index.js';

const apiKey = process.env.ONEDEX_API_KEY;
if (!apiKey) {
  throw new Error('Set ONEDEX_API_KEY before calling subscriber endpoints.');
}

const address = process.argv.slice(2).join(' ') || '10 rue des cordeliers aix';
const client = new OneDexClient({
  baseUrl: process.env.ONEDEX_BASE_URL,
  apiKey,
});

const fields = ['summary', 'rail'];
const usage = await client.account.usage();
console.log('credits_remaining=', usage.credits?.total_remaining ?? '');

try {
  const details = await client.address.details({ address, fields });
  console.log(JSON.stringify(details, null, 2));
} catch (error) {
  if (!(error instanceof OneDexApiError) || error.status !== 402 || error.body?.error !== 'address_unlock_required') {
    throw error;
  }

  if (process.env.ONEDEX_UNLOCK !== '1') {
    console.error('Address is locked. Re-run with ONEDEX_UNLOCK=1 to consume one address credit when needed.');
    console.error(JSON.stringify(error.body, null, 2));
    process.exitCode = 2;
  } else {
    const unlock = error.body.unlock_request
      ? await client.address.unlock(error.body.unlock_request)
      : await client.address.unlock({ normalizedAddressKey: error.body.normalized_address_key });

    const details = unlock.details_url
      ? await client.request('GET', unlock.details_url)
      : await client.address.details({ normalizedAddressKey: unlock.normalized_address_key, fields });

    console.log(JSON.stringify(details, null, 2));
  }
}
