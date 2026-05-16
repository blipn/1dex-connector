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
| Environment name | leave empty |

## Release

1. Push `main` to GitHub.
2. In GitHub Actions, run the `npm publish` workflow manually.
3. Verify the package:

```bash
npm view @1dex-fr/1dex version
npm i @1dex-fr/1dex
npx 1dex map parcelles "50 rue des tanneurs aix" --viewport-render-mode features
```

The workflow publishes from `cli/` with:

```bash
npm publish --access public --provenance
```
