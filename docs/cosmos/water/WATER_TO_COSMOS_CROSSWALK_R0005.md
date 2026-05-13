# R-0005 Water-to-Cosmos crosswalk

| Water contract | Cosmos R-0005 mapping | Status |
|---|---|---|
| One coherent water body | `uOneWaterOpticsStrength`, shared bathymetry/weather sampling, depth-coupled ocean/planet shaders | Implemented first pass |
| Depth-aware water | `uCosmosBathymetryAtlas`, `CosmosBathymetryState`, RGBA depth/shelf/coast/land contract | Implemented fallback + loader |
| Shallow shelves | Green channel shelf mask drives shallow/tropical optics and caustics | Implemented first pass |
| Coast/runup/foam causality | Blue channel coast mask adds shoal/coastal foam energy | Implemented first pass |
| Abyss/deep water | Red depth channel darkens/weights open-ocean color and underwater absorption | Implemented first pass |
| Bathymetry data pipeline | Procedural atlas builder and NOAA ETOPO WMS preview script | Implemented, real fetch pending local DNS/network |
| Wave dispersion | `deepWaterKinematics`, `shallowWaterPhaseSpeed`, `capillaryGravityAngularFrequency` | Implemented + tested |
| EBT top-K event route | `selectTopBreakerEvents` + bounded energy scoring | Implemented helper + tested |
| SF0/SF1 spawn fields | Next debug MVP target | Deferred |
| Localized MLS-MPM | Future event-gated detail island | Deferred |
| No-stall debug | UI status panels and CPU-safe status telemetry only | Preserved |

## Atlas encoding

```text
public/cosmos/bathymetry/global-depth.png
public/cosmos/bathymetry/global-depth.manifest.json

RGBA contract:
R = normalized water depth, 0 shore/land, 1 abyss/hadal
G = shelf / shallow optical mask
B = coast / runup / foam-adjacency mask
A = land mask
```

## Shader import points

```text
src/cosmos/orbital/shaders/common.ts      -> BATHYMETRY_ATLAS_GLSL
src/cosmos/orbital/shaders/ocean.ts       -> projected grid ocean, underwater fog, coastal foam
src/cosmos/orbital/shaders/planet.ts      -> orbital ocean color, shelves, land/coast awareness
src/cosmos/orbital/WorldEngine.ts         -> uniforms, texture lifecycle, status callbacks
src/pages/CosmosReview.tsx                -> art controls and data status panel
```

## Next crosswalk targets

1. Convert real ETOPO/GEBCO elevation into the RGBA atlas contract.
2. Add a debug overlay for bathymetry channels in `/cosmos-review`.
3. Add SF0/SF1 spawn-field debug MVP around sea-level and storm-zone bookmarks.
4. Add event-gated foam/spray lifecycle from `selectTopBreakerEvents`.
