# Datasets

This public repository documents the verified public map-layer surfaces currently reachable on `1dex.fr`.

```http
GET https://1dex.fr/explore/map-layer/{layer}?address=...
```

Verified layers:

- `parcelles`: cadastral parcel geometries around an address.
- `parcelles_dvf`: parcels with DVF sale signals.
- `parcelles_travaux`: parcels with active works signals.
- `iris`: IRIS geometries and FDep coloring around the address.
- `context`: resolved address point.
- `parcelles_labels`: labels for loaded parcels.

Add new dataset pages only when the corresponding public endpoint is reachable and has been verified from this repository.

## Public Data Scope

- Public in this connector: cadastral parcel features, DVF parcel signals, active works parcel signals, IRIS, address context, and parcel labels around an address.
- Developer tooling: npm CLI, curl, OpenAPI, examples, and interactive docs.
- Not published here: private 1dex datasets, paid workflows, exports, internal pipelines, and future authenticated APIs.

The public connector focuses on one real search intent: find parcel data from an address and retrieve a machine-readable response.
