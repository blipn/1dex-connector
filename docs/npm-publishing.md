# Package publishing

The CLI package is published as `@1dex-fr/1dex`. The JavaScript connector package is published as `@1dex-fr/connector`.

Publishing uses npm Trusted Publishing with GitHub Actions OIDC. Do not create or store an `NPM_TOKEN` for this repository.

## npm Trusted Publisher

In the npm package settings for `@1dex-fr/1dex` and `@1dex-fr/connector`, configure:

| Field | Value |
| --- | --- |
| Publisher | `GitHub Actions` |
| Organization or user | `blipn` |
| Repository | `1dex-connector` |
| Workflow filename | `npm-publish.yml` |
| Environment name | `npm` |

## npm release

1. Bump `cli/package.json` for a CLI release, or `packages/js/package.json` for a JS connector release.
2. Merge the validated release branch into `main`.
3. Changes under `cli/` start the npm workflow automatically. The JS connector is intentionally manual: start `npm-publish.yml` with `publish_js_connector=true` after its trusted publisher is configured.
4. Verify the package:

```bash
npm view @1dex-fr/1dex version
npm view @1dex-fr/connector version
npm i @1dex-fr/1dex
npm i @1dex-fr/connector
npx 1dex parcelles "50 rue des tanneurs aix" -f summary
npx 1dex doctor
```

The workflow publishes from `cli/` and `packages/js/` with:

```bash
npm publish --access public --provenance
```

The workflow first runs a dry-run and skips publishing when the package version already exists on npm.

## PyPI release

The Python distribution is `1dex-connector`; its import package remains `onedex`. The `pypi-publish.yml` workflow runs after Python package changes reach `main`, and can also be started manually. It builds a wheel, refuses an already-published version, then publishes through the protected `pypi` environment with GitHub OIDC trusted publishing. No long-lived PyPI token belongs in this repository.

Before merge, bump `packages/python/pyproject.toml` and run `npm run check:package-python`. The supported release floor is Python 3.10. The Node packages require Node 22 or newer; CI covers Node 22/24 and Python 3.10/3.12.

All three distributions use the repository MIT license. Publishing workflows remain restricted to `main`; pushing a feature branch validates packages but does not publish them.

## Troubleshooting

If GitHub Actions signs provenance but npm returns `E404 Not Found - PUT https://registry.npmjs.org/@1dex-fr%2f1dex` or `@1dex-fr%2fconnector`, the package exists but this repository is not authorized as its Trusted Publisher. Re-open the npm package settings for the failing package and check the Trusted Publisher values exactly:

- Publisher: `GitHub Actions`
- Organization or user: `blipn`
- Repository: `1dex-connector`
- Workflow filename: `npm-publish.yml`
- Environment name: `npm`

The workflow declares `environment: npm` on the publish job so the OIDC subject matches the Trusted Publisher configured in npm.
