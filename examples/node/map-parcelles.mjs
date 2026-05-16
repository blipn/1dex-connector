import { OneDexClient } from '../../packages/js/src/index.js';

const client = new OneDexClient({
  baseUrl: process.env.ONEDEX_BASE_URL,
});

const response = await client.map.parcelles({
  address: '50 rue des tanneurs aix',
  viewport_render_mode: 'features',
});
console.log(JSON.stringify(response, null, 2));
