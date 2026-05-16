# 1dex

Command-line client for the public 1dex parcel map-layer endpoint.

## Install

```bash
npm i -g @1dex-fr/1dex
```

Or install it in a project and run it with `npx`:

```bash
npm i @1dex-fr/1dex
npx 1dex map parcelles "50 rue des tanneurs aix" --viewport-render-mode features
```

## Usage

```bash
1dex map parcelles "50 rue des tanneurs aix" --viewport-render-mode features
```

The command calls `https://1dex.fr/explore/map-layer/parcelles` and prints the JSON response.

```bash
1dex map parcelles "50 rue des tanneurs aix" --viewport-render-mode features --format csv
```

Set `ONEDEX_BASE_URL` only if you need to target another compatible environment.
