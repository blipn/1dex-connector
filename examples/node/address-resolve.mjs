import { OneDexClient } from '../../packages/js/src/index.js';

const client = new OneDexClient({
  baseUrl: process.env.ONEDEX_BASE_URL,
  apiKey: process.env.ONEDEX_API_KEY,
});

const response = await client.address.resolve('10 rue de la Paix, Paris');
console.log(JSON.stringify(response, null, 2));
