# Package publishing

The npm distributions are `@1dex-fr/connector` (JavaScript SDK) and `@1dex-fr/1dex` (CLI). The Python distribution is `1dex-connector`; its import package is `onedex`.

Both publishing workflows run after the `CI` workflow succeeds for a push to `main`. Manual dispatch is also restricted to `main` and requires successful push CI for the exact checked-out commit. Each publisher verifies that commit is still the current remote `main` before publishing. Feature branches and pull requests validate packages without publishing them.

## npm Trusted Publisher

Publishing uses GitHub Actions OIDC. Do not create or store an `NPM_TOKEN` for this repository. Configure these values for **both** npm packages before their release:

| Field | Value |
| --- | --- |
| Publisher | `GitHub Actions` |
| Organization or user | `blipn` |
| Repository | `1dex-connector` |
| Workflow filename | `npm-publish.yml` |
| Environment name | `npm` |
| Allowed actions | `npm publish` |

The workflow uses Node 24 and npm 11.13.0, which support [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/). The GitHub `npm` environment and npm's trusted publisher configuration must match exactly. For a package never published before, confirm its registry-side setup with the package owner before expecting the first OIDC publication to succeed; a registry 404 does not establish publishing permission.

## Release procedure

1. Set the intended versions in `packages/js/package.json`, `cli/package.json`, and `packages/python/pyproject.toml`. The CLI's exact `@1dex-fr/connector` dependency must match the SDK version being tested; refresh and commit the root `package-lock.json` with those changes.
2. Run `npm ci --ignore-scripts` then `npm run ci`. CI covers Node 22/24 and Python 3.10/3.12. The npm package check installs **both local tarballs together, offline**, so an unpublished SDK version can be tested with the CLI. It exercises the installed SDK and CLI, including idempotency headers and command URL generation. The Python check builds an sdist, builds the wheel from that sdist, then validates metadata, licenses, and an isolated installed import.
3. Merge the reviewed release into `main`. Its successful CI triggers the npm and PyPI workflows. The npm job publishes the JavaScript SDK **before** the CLI, stopping if the SDK publication fails. Each npm archive is checked against its manifest. An existing registry version must have the same `dist.integrity` as the local archive; otherwise publication stops and requires a version bump. An absent version is dry-run validated, then that same archive is published with provenance. Python publication runs independently.
4. Inspect both publishing runs and verify each intended registry version. A complete version already present is skipped, so a manual rerun on the same `main` can resume a release interrupted between packages. A PyPI version missing its expected wheel or sdist stops the workflow for inspection; it is not automatically repaired or reported as complete. Only HTTP 404 is treated as an absent version; registry failures stop publication.

For a release whose three intended versions are `0.2.0`, verify:

```bash
npm view @1dex-fr/connector@0.2.0 version dist.integrity dist.attestations
npm view @1dex-fr/1dex@0.2.0 version dependencies dist.integrity dist.attestations
npm exec --yes --package=@1dex-fr/1dex@0.2.0 -- 1dex --version
python -m pip index versions 1dex-connector
```

Use a fresh project or virtual environment to install the intended exact versions and exercise a no-network import or `--help`/`--version` command. Confirm the distribution version rather than relying only on a moving `latest` tag. All three distributions use the repository MIT license.

## PyPI Trusted Publisher

The `pypi-publish.yml` job uses the GitHub `pypi` environment and the PyPI project `1dex-connector`. Configure its trusted publisher with owner `blipn`, repository `1dex-connector`, workflow filename `pypi-publish.yml`, and environment `pypi`. No long-lived PyPI token belongs in this repository.

The workflow builds both distributions with `python -m build` (wheel from sdist), validates them with `python -m twine check --strict dist/*`, then publishes through `pypa/gh-action-pypi-publish` with OIDC. An existing version is skipped only when its registry file list contains both `1dex_connector-<version>-py3-none-any.whl` and `1dex_connector-<version>.tar.gz`. An incomplete version fails with the missing filenames. Python 3.10 is the supported runtime floor. The build backend requires setuptools 77.0.3 or newer for the project's SPDX license and license-file metadata; see the [Python packaging guide](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/).

## Troubleshooting

An npm publish `E404` can indicate a missing package, scope, or authorization mismatch; it does not prove the package already exists. Check the registry state and package ownership, then compare the trusted publisher's owner, repository, workflow filename, and environment against the table above. An OIDC failure must be resolved in that configuration, without adding a legacy token fallback.

A failed `Require current main and its successful CI` step means the selected commit is stale or lacks successful push CI. Wait for the current `main` CI, then rerun from `main`. A registry timeout or non-404 error must be retried after the registry is healthy; it must not be reinterpreted as an unpublished version.
