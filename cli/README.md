# 1dex

Command-line client for the public 1dex parcel map-layer endpoint.

## Install

```bash
npm i -g @1dex-fr/1dex
```

Or install it in a project and run it with `npx`:

```bash
npm i @1dex-fr/1dex
npx 1dex map parcelles "50 rue des tanneurs aix" --viewport-render-mode features
```

## Usage

```bash
1dex map parcelles "50 rue des tanneurs aix" --viewport-render-mode features
```

The command calls `https://1dex.fr/explore/map-layer/parcelles` and prints the JSON response.

```bash
1dex map parcelles "50 rue des tanneurs aix" --viewport-render-mode features --format csv
```

## Options

```text
1dex map parcelles <address> [options]
1dex map parcelles --address <address> [options]

-a, --address <text>                 Address to resolve.
-r, --viewport-render-mode <mode>    Response render mode. Verified value: features.
-b, --viewport-bbox <bbox>           Map bbox: minLon,minLat,maxLon,maxLat.
-z, --viewport-zoom <number>         Map zoom level.
    --city-code <code>               INSEE city code if already known.
    --lon <number>                   Longitude if already known.
    --lat <number>                   Latitude if already known.
    --base-url <url>                 Override API base URL.
    --timeout-ms <number>            Request timeout in milliseconds.
-f, --format <json|csv|summary>      Output format.
-u, --url                            Print the generated URL and exit.
-h, --help                           Show help.
-V, --version                        Show version.
```

Examples:

```bash
1dex map parcelles --address "50 rue des tanneurs aix" --url
1dex map parcelles "50 rue des tanneurs aix" -f summary
1dex map parcelles "50 rue des tanneurs aix" \
  --lon 5.446245 --lat 43.52782 \
  --viewport-bbox 5.4457,43.5274,5.4468,43.5282 \
  --viewport-zoom 19
```

Set `ONEDEX_BASE_URL` only if you need to target another compatible environment.
