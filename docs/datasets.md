# Datasets

This public repository does not publish a dataset catalog yet.

The only documented data surface is the verified parcel map-layer endpoint:

```http
GET https://1dex.fr/explore/map-layer/parcelles?address=...
```

Add new dataset pages only when the corresponding public endpoint is reachable and has been verified from this repository.

## Public vs private surfaces

- Free/public in this connector: parcel features around an address, through `GET /explore/map-layer/parcelles`.
- Free/public tooling: npm CLI, curl, OpenAPI, examples, and interactive docs.
- Not published here: private 1dex datasets, paid workflows, exports, internal pipelines, and future authenticated APIs.

The public connector should help people solve one real data question first, then discover the broader 1dex platform.
