# Changelog

## 0.1.7

- Unify PyPI and npm package READMEs for public reads, professional auth, purchase, detailed reads, unlock flow, `details_url`, account usage, and access errors.
- Bump CLI package to `0.1.7` so npm republishes the unified CLI README.
- Bump JS and Python connector packages to `0.1.3` so package pages expose the same subscriber API guidance.

## 0.1.6

- Sync connector helpers with `1dex-data-v2/main` public API v1 routes.
- Add JS, Python, CLI, and site console support for `address-details`, `address-unlocks`, `account/usage`, `public-preview`, `communes/search`, and `map-focus/*`.
- Add `apiKey` / `api_key` / `--api-key` / `ONEDEX_API_KEY` support for subscriber API calls.
- Reject mixed subscriber locators when `normalized_address_key` is combined with address, parcel, or coordinate inputs.
- Publish the Python distribution as `1dex-connector` while keeping the `onedex` import package.
- Add TypeScript response types and clearer docs for professional subscriber details, unlocks, credits, grants, and usage quotas.
- Refresh docs and static examples to point API key access to `https://1dex.fr/compte/api` and keep OpenAPI ownership on `1dex.fr`.
- Bump CLI to `0.1.6` and JS/Python connector packages to `0.1.2`.

## 0.1.5

- Sync connector location inputs with the live `1dex.fr/api/v1` OpenAPI surface.
- Let CLI, JavaScript, and Python map helpers use `city_code` without requiring an address or coordinates.
- Add CLI support for `address-overview` `parcel_record_key` and `dvf_year` parameters.
- Bump JS and Python connector package versions to `0.1.1`.

## 0.1.4

- Publish the CLI address-overview default after `0.1.3` was already released with the previous parcel default.
- Make `1dex "<address>"` call `/api/v1/address-overview` with `dvf_radius_m=600`.
- Keep parcel and map-layer requests behind explicit commands such as `1dex parcelles "<address>"`.

## 0.1.3

- Add the public address overview connector surface for the JSON aperçu contract.
- Document `client.overview.address(...)` in JavaScript and Python examples.
- Refresh CLI package metadata for the next npm publication.

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
