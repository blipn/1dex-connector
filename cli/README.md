# 1dex

Command-line client for the free 1dex connector.

The CLI covers both the public address overview and the verified public map layers on `1dex.fr`. Use `overview` when you want the address cards flow; use the map-layer commands when you need parcelles, DVF, works, IRIS, context, or parcel labels in JSON, CSV, or summary format. The bare form `1dex <address>` remains the compatibility shortcut for the public address overview.

## Install

```bash
npm i -g @1dex-fr/1dex
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
```

Or install it in a project and run it with `npx`:

```bash
npm i @1dex-fr/1dex
npx 1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
npx 1dex parcelles "50 rue des tanneurs aix" -f summary
npx 1dex dvf "50 rue des tanneurs aix" -f summary
npx 1dex travaux "50 rue des tanneurs aix" -f summary
```

## Usage

```bash
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
1dex parcelles "50 rue des tanneurs aix" --format summary
1dex dvf "50 rue des tanneurs aix" --format summary
1dex travaux "50 rue des tanneurs aix" --format summary
```

`1dex overview` calls `https://1dex.fr/api/v1/address-overview` and prints the public address overview payload. The bare `1dex <address>` form keeps the same overview route for backwards compatibility. The map-layer commands call `https://1dex.fr/explore/map-layer/{layer}` and print JSON, CSV, or a short summary. `parcelles` is the primary free connector layer; `dvf`, `travaux`, `iris`, `context`, and `labels` are public verified shortcuts.

```bash
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
1dex "10 rue des cordeliers aix"
1dex parcelles "50 rue des tanneurs aix" --format csv
1dex parcelles "50 rue des tanneurs aix" --url
```

Run `1dex examples` for copy-paste commands and `1dex doctor` to verify that the public endpoint answers from your machine.

## Options

```text
1dex <address> [options]
1dex overview <address> [options]
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
-d, --dvf-radius-m <number>          DVF radius for address overview. Default: 600.
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
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
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
Set `ONEDEX_NO_UPDATE_CHECK=1` to disable the npm update notice in automated environments.
