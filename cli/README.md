# 1dex

Command-line client for the free 1dex connector.

The main use case is simple: start from a French address and retrieve nearby cadastral parcels in JSON, CSV, or summary format, without an API key. Verified complementary layers are available for DVF, works, IRIS, context, and parcel labels when you need to inspect the public map-layer signals exposed today on `1dex.fr`.

## Install

```bash
npm i -g @1dex-fr/1dex
1dex "50 rue des tanneurs aix"
```

Or install it in a project and run it with `npx`:

```bash
npm i @1dex-fr/1dex
npx 1dex "50 rue des tanneurs aix"
npx 1dex parcelles "50 rue des tanneurs aix" -f summary
npx 1dex dvf "50 rue des tanneurs aix" -f summary
npx 1dex travaux "50 rue des tanneurs aix" -f summary
```

## Usage

```bash
1dex "50 rue des tanneurs aix"
1dex parcelles "50 rue des tanneurs aix" --format summary
1dex dvf "50 rue des tanneurs aix" --format summary
1dex travaux "50 rue des tanneurs aix" --format summary
```

The command calls `https://1dex.fr/explore/map-layer/{layer}` and prints JSON, CSV, or a short summary. `parcelles` is the primary free connector layer; `dvf`, `travaux`, `iris`, `context`, and `labels` are public verified shortcuts.

```bash
1dex parcelles "50 rue des tanneurs aix" --format csv
1dex parcelles "50 rue des tanneurs aix" --url
```

Run `1dex examples` for copy-paste commands and `1dex doctor` to verify that the public endpoint answers from your machine.

## Options

```text
1dex <address> [options]
1dex parcelles <address> [options]
1dex dvf <address> [options]
1dex travaux <address> [options]
1dex iris <address> [options]
1dex layer <layer> <address> [options]
1dex map parcelles <address> [options]
1dex map parcelles --address <address> [options]
1dex examples
1dex doctor [--address <address>] [options]

-a, --address <text>                 Address to resolve.
-l, --layer <layer>                  Public layer: parcelles, dvf, travaux, iris, context, labels.
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
1dex "50 rue des tanneurs aix"
1dex parcelles --address "50 rue des tanneurs aix" --url
1dex dvf "50 rue des tanneurs aix" -f summary
1dex travaux "50 rue des tanneurs aix" -f summary
1dex layer iris "50 rue des tanneurs aix" -f summary
1dex parcelles "50 rue des tanneurs aix" -f summary
1dex parcelles "50 rue des tanneurs aix" \
  --lon 5.446245 --lat 43.52782 \
  --viewport-bbox 5.4457,43.5274,5.4468,43.5282 \
  --viewport-zoom 19
1dex doctor
```

Set `ONEDEX_BASE_URL` only if you need to target another compatible environment.
