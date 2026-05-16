# Changelog

## 0.1.2

- Add verified public map layers for DVF, active works, IRIS, address context, and parcel labels.
- Add CLI commands `1dex dvf`, `1dex travaux`, `1dex iris`, and `1dex layer <layer>`.
- Extend JavaScript and Python clients with `map.dvf`, `map.travaux`, `map.iris`, `map.context`, and `map.layer`.
- Update OpenAPI and docs from one parcel-only route to `GET /explore/map-layer/{layer}`.

## 0.1.1

- Add the shorter `1dex parcelles` command while keeping `1dex map parcelles`.
- Add `1dex examples` for copy-paste CLI commands.
- Add `1dex doctor` to verify that the public endpoint answers from the current machine.
- Improve CLI error hints for invalid options, missing addresses, invalid numbers, and network failures.
- Document the published npm package and public/private data boundary.

## 0.1.0

- Publish the standalone `@1dex-fr/1dex` CLI package.
- Document the verified public parcel map-layer endpoint on `https://1dex.fr`.
