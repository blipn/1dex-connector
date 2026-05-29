# Examples

Runnable examples:

- `examples/curl/map-parcelles.sh`
- `examples/go/map-parcelles.go`
- `examples/node/map-parcelles.mjs`
- `examples/python/map_parcelles.py`

The examples work against the public website host by default:

```bash
export ONEDEX_BASE_URL=https://1dex.fr
```

`ONEDEX_BASE_URL` is optional unless you intentionally target another environment.

CLI examples:

```bash
1dex overview "10 rue des cordeliers aix" --dvf-radius-m 300
1dex "10 rue des cordeliers aix"
1dex parcelles "50 rue des tanneurs aix" -f summary
1dex dvf "50 rue des tanneurs aix" -f summary
1dex travaux "50 rue des tanneurs aix" -f summary
1dex layer iris "50 rue des tanneurs aix" -f summary
1dex parcelles "50 rue des tanneurs aix" --url
1dex examples
1dex doctor
```

`1dex <address>` and `1dex overview <address>` both call the public address overview route. `1dex parcelles` is the short form for the public map-layer route, and `1dex map parcelles` remains available for users who prefer the explicit map-layer namespace.
