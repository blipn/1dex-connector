# 1dex

Command-line client for the public 1dex connector.

The CLI covers the public address overview, subscriber address details and unlocks, account usage, autocomplete, commune search, score endpoints, public previews, address-page state, and verified public map-layer / viewport / focus routes on `1dex.fr`. Use `overview` when you want the address cards flow; `details` / `unlock` for subscriber address flows; `autocomplete`, `communes`, or `score suggest` for search; `score` for scoring and compare flows; `state` / `preview` for public page metadata; and the map commands when you need parcelles, DVF, works, IRIS, context, labels, focus, or multi-layer viewports. The bare form `1dex <address>` remains the compatibility shortcut for the public address overview.

## Install

```bash
npm i -g @1dex-fr/1dex
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
```

Or install it in a project and run it with `npx`:

```bash
npm i @1dex-fr/1dex
npx 1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
npx 1dex details "10 rue des cordeliers aix" --fields summary,rail --api-key "$ONEDEX_API_KEY"
npx 1dex autocomplete "10 rue des cordeliers aix"
npx 1dex score address "10 rue des cordeliers aix" -f summary
npx 1dex parcelles "50 rue des tanneurs aix" -f summary
```

## Usage

```bash
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
1dex overview --city-code 13001 --parcel-record-key parcel_123 --dvf-year 2024 --url
1dex details "10 rue des cordeliers aix" --fields summary,rail,tabs --api-key "$ONEDEX_API_KEY"
1dex unlock "10 rue des cordeliers aix" --api-key "$ONEDEX_API_KEY"
1dex usage --api-key "$ONEDEX_API_KEY" -f summary
1dex autocomplete "10 rue des cordeliers aix" --limit 5
1dex communes aix --limit 5
1dex preview /ville/aix-en-provence-13001 --url
1dex score address "10 rue des cordeliers aix" -f summary
1dex score compare --input '{"items":[{"address":"10 rue des cordeliers aix"},{"address":"50 rue des tanneurs aix"}],"sortBy":"global"}'
1dex viewport "10 rue des cordeliers aix" --layers context,iris -f summary
1dex focus public-location --lon 5.446766 --lat 43.529667 -f summary
1dex parcelles "50 rue des tanneurs aix" --format summary
```

`1dex overview` calls `https://1dex.fr/api/v1/address-overview` and prints the public address overview payload. It accepts the live public location parameters (`address`, `city_code`, `lon`/`lat`, `parcel_record_key`, `dvf_radius_m`, `dvf_year`); the bare `1dex <address>` form keeps the same overview route for backwards compatibility. `details`, `unlock`, and `usage` use subscriber API keys from `--api-key` or `ONEDEX_API_KEY`. When using `--normalized-address-key`, pass it alone; do not combine it with address text, `--parcel-record-key`, or `--lon`/`--lat`. `autocomplete`, `communes`, `preview`, `state`, `viewport`, `focus`, and `score *` target the canonical `/api/v1` routes. The map-layer commands call `https://1dex.fr/api/v1/map-layer/{layer}` and print JSON, CSV, or a short summary. `parcelles` is the primary free connector layer; `dvf`, `travaux`, `iris`, `context`, and `labels` are public verified shortcuts.

```bash
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
1dex "10 rue des cordeliers aix"
1dex details "10 rue des cordeliers aix" --fields summary,rail
1dex autocomplete "10 rue des cordeliers aix" --url
1dex communes aix --url
1dex state "10-rue-de-la-paix-paris-75002"
1dex score grid --bbox 5.4457,43.5274,5.4468,43.5282 --zoom 15 --category global
1dex parcelles "50 rue des tanneurs aix" --format csv
1dex parcelles "50 rue des tanneurs aix" --url
```

Run `1dex examples` for copy-paste commands and `1dex doctor` to verify that the public endpoint answers from your machine.

## Options

```text
1dex <address> [options]
1dex overview <address|--city-code|--lon/--lat|--parcel-record-key> [options]
1dex details <address|--normalized-address-key|--parcel-record-key|--lon/--lat> --fields <csv> [options]
1dex unlock <address|--normalized-address-key|--parcel-record-key|--lon/--lat> [options]
1dex usage [options]
1dex autocomplete <query> [options]
1dex communes <query> [options]
1dex preview <path> [options]
1dex state <slug>
1dex parcelles <address> [options]
1dex dvf <address> [options]
1dex travaux <address> [options]
1dex iris <address> [options]
1dex labels <address> [options]
1dex layer <layer> <address|--lon/--lat> [options]
1dex viewport <address|--lon/--lat> [options]
1dex focus parcelle <record-key> [options]
1dex focus parcelles <record-keys> [options]
1dex focus address <address> [options]
1dex focus public-location --lon <number> --lat <number> [options]
1dex focus feature --layer-key <layer> --feature-key <key> [options]
1dex score address <address> [options]
1dex score compare [--input <json-or-@file>] [options]
1dex score grid --bbox <bbox> --zoom <number> [options]
1dex score suggest <query> [options]
1dex examples
1dex doctor [--address <address>] [options]
```

Set `ONEDEX_BASE_URL` only if you need to target another compatible environment.
Set `ONEDEX_API_KEY` for subscriber endpoints when you do not pass `--api-key`.
Set `ONEDEX_NO_UPDATE_CHECK=1` to disable the npm update notice in automated environments.
