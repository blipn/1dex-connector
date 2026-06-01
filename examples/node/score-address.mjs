import { OneDexClient } from '../../packages/js/src/index.js';

const client = new OneDexClient({
  baseUrl: process.env.ONEDEX_BASE_URL,
});

const response = await client.score.address({
  items: [{ address: process.argv.slice(2).join(' ') || '10 rue des cordeliers aix' }],
});

console.log(JSON.stringify(response, null, 2));
