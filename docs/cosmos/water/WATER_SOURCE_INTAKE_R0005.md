# R-0005 Water.zip source intake

## Intake decision

`Water.zip` is treated as a water-domain source package, not as a direct code patch to apply blindly. The useful payload for Cosmos is the physical/rendering contract:

- water is one coherent body, not a pile of effects;
- bathymetry must drive depth, shelves, shore interaction, underwater tint, caustics, and foam likelihood;
- wave/breach detail must be causal: height/slope/curvature/velocity/object impulse -> trigger field -> budgeted events -> spawn fields -> lifecycle;
- MLS-MPM/splash detail is localized L4 detail, not a global sim burden;
- debug and validation must expose causes, not just visual outputs.

## High-value source documents observed

```text
ION_WATER_WORK_SANDBOX_v0_4_VPRO_OVERLAY_VISIBILITY_FIX_20260513T000000Z.zip
ION_WATER_CONTEXT_v0_1_20260512.zip
14_PROJECT_WATER/ENGINEERING/POOL_AND_SHEET_SPEC.md
14_PROJECT_WATER/ENGINEERING/TARGET_PASS_GRAPH.md
14_PROJECT_WATER/SOURCE_UPLOADS/db1e62f2e_WAVES_RIPPLES_SPLASHES_NORTHSTAR_SPEC.md
14_PROJECT_WATER/SOURCE_UPLOADS/01ead7aee_03_Spawn_Field_SF0_SF1_First_Principles.md
14_PROJECT_WATER/SOURCE_UPLOADS/072849f7a_01_Breach_Genesis_and_Organic_Spawn.md
14_PROJECT_WATER/SOURCE_UPLOADS/dc8c5ce29_05_Visual_Blending_and_Seam_Elimination.md
14_PROJECT_WATER/SOURCE_UPLOADS/22c10015b_01_Splash_MLS_MPM_Overview.md
```

## Contract imported into Cosmos R-0005

### One-water optical rule

Base ocean, foam, caustics, underwater fog, shelves, abyssal water, and future splash/breach detail must share the same art-direction envelope. The viewer should not read foam/spray/sheets as a separate material pasted over the ocean.

### Depth-before-detail rule

Cosmos cannot reach convincing sea-level realism until bathymetry is part of every water decision. R-0005 therefore adds the bathymetry atlas contract before localized splash/MLS-MPM work.

### Causality rule

Foam and breach should be born from identifiable causes. R-0005 adds first EBT-style helper functions and tests, but the visual debug overlay is deferred to R-0006/R-0007.

### Budget rule

High-detail breach/splash must be event-selected, not spawned everywhere. R-0005 adds `selectTopBreakerEvents` as the first budgeted event-selection primitive.

## R-0005 implementation result

```text
src/cosmos/bathymetry/bathymetryOverlay.ts
src/cosmos/water/waterPhysics.ts
src/cosmos/orbital/shaders/common.ts
src/cosmos/orbital/shaders/ocean.ts
src/cosmos/orbital/shaders/planet.ts
src/cosmos/orbital/WorldEngine.ts
src/pages/CosmosReview.tsx
scripts/cosmos/build-procedural-depth-atlas.mjs
scripts/cosmos/fetch-etopo-wms-depth-preview.mjs
src/test/cosmos-bathymetry-overlay.test.ts
src/test/cosmos-water-physics.test.ts
```

## Current limitations

- The included depth atlas is procedural unless a real NOAA/GEBCO atlas is generated locally.
- The NOAA ETOPO WMS fetch path was implemented but could not resolve DNS inside this sandbox.
- SF0/SF1 debug fields are documented and partially represented through event helpers, but are not yet rendered as overlays.
- MLS-MPM remains a future localized detail path.
