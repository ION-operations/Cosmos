# Cosmos bathymetry runtime data

The runtime bathymetry atlas is optional but recommended for `/cosmos-review`.

Expected files:

```text
global-depth.png
global-depth.manifest.json
```

Encoding:

```text
R = normalized depth01, 0 shore/land, 1 abyss/hadal
G = shelf / shallow-water optical mask
B = coast / runup / foam-adjacency mask
A = land mask
```

Generate the deterministic fallback:

```bash
npm run cosmos:bathymetry:procedural
```

Attempt a NOAA ETOPO WMS preview:

```bash
npm run cosmos:bathymetry:etopo-wms
```

Production target: convert NOAA ETOPO or GEBCO elevation data into the same RGBA contract so the shaders do not change when the source changes.
