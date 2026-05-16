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
  1dex address resolve <address> [--base-url <url>] [--api-key <key>] [--format json|csv]
  1dex address autocomplete <query> [--limit <n>] [--base-url <url>] [--api-key <key>]
  1dex address sources <address> [--source-keys <a,b>] [--base-url <url>] [--api-key <key>] [--format json|csv]
  1dex source query <source-key> (--address <address> | --payload <json>) [--base-url <url>] [--api-key <key>] [--format json|csv]
  1dex datasets list [--base-url <url>] [--api-key <key>]

Environment:
  ONEDEX_BASE_URL
  ONEDEX_API_KEY
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
    apiKey: flags['api-key'] ?? process.env.ONEDEX_API_KEY,
  });
}

function parseSourceKeys(value) {
  if (!value) {
    return undefined;
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function printCsv(response) {
  if (Array.isArray(response?.data?.results)) {
    console.log(['source_key', 'status', 'dataset_updated_at', 'warnings'].join(','));
    for (const result of response.data.results) {
      console.log([
        result?.source?.source_key,
        result?.status,
        result?.source?.dataset_updated_at,
        (result?.warnings ?? []).map((warning) => warning.code).join('|'),
      ].map(toCsvValue).join(','));
    }
    return;
  }

  if (Array.isArray(response?.data?.suggestions)) {
    console.log(['label', 'match_score', 'lon', 'lat', 'city_code', 'postcode'].join(','));
    for (const suggestion of response.data.suggestions) {
      console.log([
        suggestion.label,
        suggestion.match_score,
        suggestion.coordinates?.lon,
        suggestion.coordinates?.lat,
        suggestion.city_code,
        suggestion.postcode,
      ].map(toCsvValue).join(','));
    }
    return;
  }

  console.log(['request_id', 'status', 'source_key', 'data'].join(','));
  console.log([
    response?.request_id,
    response?.status,
    response?.source?.source_key,
    response?.data,
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
  const [resource, action, subject, ...rest] = positional;

  if (!resource || flags.help) {
    console.log(usage());
    return;
  }

  const client = createClient(flags);
  let response;

  if (resource === 'address' && action === 'resolve') {
    const address = [subject, ...rest].filter(Boolean).join(' ').trim();
    if (!address) {
      throw new Error('Missing address.');
    }
    response = await client.address.resolve(address);
  } else if (resource === 'address' && action === 'autocomplete') {
    const q = [subject, ...rest].filter(Boolean).join(' ').trim();
    if (!q) {
      throw new Error('Missing autocomplete query.');
    }
    response = await client.address.autocomplete(q, {
      limit: flags.limit ? Number(flags.limit) : undefined,
    });
  } else if (resource === 'address' && action === 'sources') {
    const address = [subject, ...rest].filter(Boolean).join(' ').trim();
    if (!address) {
      throw new Error('Missing address.');
    }
    response = await client.address.sources({
      address,
      ...(flags['source-keys'] ? { source_keys: parseSourceKeys(flags['source-keys']) } : {}),
    });
  } else if (resource === 'source' && action === 'query') {
    const sourceKey = subject;
    if (!sourceKey) {
      throw new Error('Missing source key.');
    }
    const payload = flags.payload
      ? JSON.parse(String(flags.payload))
      : flags.address
        ? { address: String(flags.address) }
        : undefined;
    if (!payload) {
      throw new Error('Provide --address or --payload.');
    }
    response = await client.source.query(sourceKey, payload);
  } else if (resource === 'datasets' && action === 'list') {
    response = await client.datasets.list();
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
