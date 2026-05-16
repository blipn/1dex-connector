# npm Publishing

The CLI package is published as `@1dex-fr/1dex`.

Publishing uses npm Trusted Publishing with GitHub Actions OIDC. Do not create or store an `NPM_TOKEN` for this repository.

## npm Trusted Publisher

In the npm package settings for `@1dex-fr/1dex`, configure:

| Field | Value |
| --- | --- |
| Publisher | `GitHub Actions` |
| Organization or user | `blipn` |
| Repository | `1dex-connector` |
| Workflow filename | `npm-publish.yml` |
| Environment name | `npm` |

## Release

1. Bump `cli/package.json`.
2. Push `main` to GitHub.
3. The `npm publish` workflow runs automatically when files under `cli/` change. It can also be started manually from GitHub Actions.
4. Verify the package:

```bash
npm view @1dex-fr/1dex version
npm i @1dex-fr/1dex
npx 1dex parcelles "50 rue des tanneurs aix" -f summary
npx 1dex doctor
```

The workflow publishes from `cli/` with:

```bash
npm publish --access public --provenance
```

The workflow first runs a dry-run and skips publishing when `@1dex-fr/1dex@<version>` already exists on npm.

## Troubleshooting

If GitHub Actions signs provenance but npm returns `E404 Not Found - PUT https://registry.npmjs.org/@1dex-fr%2f1dex`, the package exists but this repository is not authorized as its Trusted Publisher. Re-open the npm package settings for `@1dex-fr/1dex` and check the Trusted Publisher values exactly:

- Publisher: `GitHub Actions`
- Organization or user: `blipn`
- Repository: `1dex-connector`
- Workflow filename: `npm-publish.yml`
- Environment name: `npm`

The workflow declares `environment: npm` on the publish job so the OIDC subject matches the Trusted Publisher configured in npm.
