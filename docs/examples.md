# Examples

Runnable examples:

- `examples/curl/address-overview.sh`
- `examples/curl/map-parcelles.sh`
- `examples/go/map-parcelles.go`
- `examples/node/address-overview.mjs`
- `examples/node/score-address.mjs`
- `examples/node/map-parcelles.mjs`
- `examples/python/address_overview.py`
- `examples/python/score_address.py`
- `examples/python/map_parcelles.py`

The examples work against the public website host by default:

```bash
export ONEDEX_BASE_URL=https://1dex.fr
```

`ONEDEX_BASE_URL` is optional unless you intentionally target another environment.

CLI examples:

```bash
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
1dex overview --city-code 13001 --parcel-record-key parcel_123 --dvf-year 2024 --url
1dex "10 rue des cordeliers aix"
1dex autocomplete "10 rue des cordeliers aix" --limit 5
1dex state "10-rue-de-la-paix-paris-75002"
1dex score address "10 rue des cordeliers aix" -f summary
1dex score compare --input '{"items":[{"address":"10 rue des cordeliers aix"},{"address":"50 rue des tanneurs aix"}],"sortBy":"global"}'
1dex score grid --bbox 5.4457,43.5274,5.4468,43.5282 --zoom 15 --category global -f summary
1dex score suggest "10 rue des cordeliers aix" --limit 5
1dex viewport "10 rue des cordeliers aix" --layers context,iris -f summary
1dex parcelles "50 rue des tanneurs aix" -f summary
1dex dvf "50 rue des tanneurs aix" -f summary
1dex travaux "50 rue des tanneurs aix" -f summary
1dex layer iris "50 rue des tanneurs aix" -f summary
1dex parcelles "50 rue des tanneurs aix" --url
1dex examples
1dex doctor
```

`1dex <address>` and `1dex overview <address>` both call the public address overview route. The other commands map directly to the canonical `/api/v1` public endpoints.
