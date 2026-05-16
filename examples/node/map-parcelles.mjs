import { OneDexClient } from '../../packages/js/src/index.js';

const client = new OneDexClient({
  baseUrl: process.env.ONEDEX_BASE_URL,
});

const response = await client.map.parcelles({
  addressSlug: '10-rue-des-cordeliers-aix-en-provence-13100',
  city_code: '13001',
  lon: 5.446765371857839,
  lat: 43.52966775616209,
  parcel_record_key: '13001000AS0323',
  parcel_phase: 'initial',
  viewport_bbox: '5.44628,43.52926,5.44725,43.53008',
  viewport_zoom: 19.25,
  viewport_render_mode: 'features',
});
console.log(JSON.stringify(response, null, 2));
