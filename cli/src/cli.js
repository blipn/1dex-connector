#!/usr/bin/env node
let connectorModule;
try {
  connectorModule = await import('@1dex/connector');
} catch {
  connectorModule = await import('../../packages/js/src/index.js');
}

const { OneDexApiError, OneDexClient } = connectorModule;

function usage() {
  return `1dex CLI

Usage:
  1dex map parcelles <address> [--viewport-bbox <bbox>] [--viewport-zoom <n>] [--viewport-render-mode features]

Environment:
  ONEDEX_BASE_URL (defaults to https://1dex.fr)
`;
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      positional.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positional, flags };
}

function createClient(flags) {
  return new OneDexClient({
    baseUrl: flags['base-url'] ?? process.env.ONEDEX_BASE_URL,
  });
}

function toCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function printCsv(response) {
  console.log(['layerKey', 'status', 'feature_count', 'summary'].join(','));
  console.log([
    response?.layerKey,
    response?.status,
    response?.data?.features?.length,
    response?.summary,
  ].map(toCsvValue).join(','));
}

function printResult(response, flags) {
  if ((flags.format ?? 'json') === 'csv') {
    printCsv(response);
    return;
  }
  console.log(JSON.stringify(response, null, 2));
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [resource, action, ...subjectParts] = positional;

  if (!resource || flags.help) {
    console.log(usage());
    return;
  }

  const client = createClient(flags);
  let response;

  if (resource === 'map' && action === 'parcelles') {
    const address = subjectParts.join(' ').trim();
    if (!address) {
      throw new Error('Missing address.');
    }
    response = await client.map.parcelles({
      address,
      city_code: flags['city-code'],
      lon: flags.lon ? Number(flags.lon) : undefined,
      lat: flags.lat ? Number(flags.lat) : undefined,
      viewport_bbox: flags['viewport-bbox'],
      viewport_zoom: flags['viewport-zoom'] ? Number(flags['viewport-zoom']) : undefined,
      viewport_render_mode: flags['viewport-render-mode'] ?? 'features',
    });
  } else {
    throw new Error(`Unknown command: ${process.argv.slice(2).join(' ')}`);
  }

  printResult(response, flags);
}

main().catch((error) => {
  if (error instanceof OneDexApiError) {
    console.error(`${error.message} (${error.status || 'network'})`);
    if (error.requestId) {
      console.error(`request_id=${error.requestId}`);
    }
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
});
