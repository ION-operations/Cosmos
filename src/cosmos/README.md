# Cosmos renderer modules

`weatherAtlas.ts` creates the deterministic fallback atlas that currently stands in for future live weather and satellite products. The atlas contract is shared by both the main Water World route and the orbital review route.

R-0005 adds `bathymetry/bathymetryOverlay.ts` and `water/waterPhysics.ts`, which start the one-water depth/physics layer imported from the Water.zip contract.

## Weather atlas channels

```text
weatherA RGBA       = cloud cover, cloud liquid, cloud ice/cirrus, precipitation/storm energy
weatherB RGBA       = encoded wind U, encoded wind V, humidity, temperature
terrainForcingA     = elevation, land mask, coast proximity, roughness/drag
terrainForcingB     = evaporation potential, heat capacity, orographic forcing, lee shadow
```

## Bathymetry atlas channels

```text
bathymetry RGBA     = depth01, shelf/shallow, coast/runup, land mask
```

Depth atlas runtime location:

```text
public/cosmos/bathymetry/global-depth.png
public/cosmos/bathymetry/global-depth.manifest.json
```

## Current consumers

```text
src/pages/ProceduralEarth.tsx
src/pages/CosmosReview.tsx
src/cosmos/orbital/WorldEngine.ts
src/cosmos/orbital/shaders/common.ts
src/cosmos/orbital/shaders/clouds.ts
src/cosmos/orbital/shaders/planet.ts
src/cosmos/orbital/shaders/ocean.ts
src/cosmos/bathymetry/bathymetryOverlay.ts
src/cosmos/gibs/gibsSurfaceOverlay.ts
src/cosmos/water/waterPhysics.ts
```

R-0003 added `WEATHER_ATLAS_GLSL`, so orbital clouds, the orbital planet pass, and the projected-grid ocean now sample the same macro weather state.

R-0005 adds `BATHYMETRY_ATLAS_GLSL`, so the orbital planet and projected ocean share depth/shelf/coast/land sampling.

## Current data scripts

```bash
npm run cosmos:gibs:capabilities
npm run cosmos:gibs:catalog
npm run cosmos:gibs:preview-tile
npm run cosmos:gibs:global-snapshot
npm run cosmos:bathymetry:procedural
npm run cosmos:bathymetry:etopo-wms
npm run cosmos:review:screenshots
```

## Next provider goal

Keep the contracts stable while replacing deterministic fallback layers with optional real providers:

- NASA GIBS satellite imagery for surface/cloud visual truth;
- NOAA/GFS weather fields and ERA5 replay for macro weather;
- Copernicus Marine wave/ocean products for sea state;
- NOAA ETOPO or GEBCO for elevation/bathymetry-derived depth, shelf, coast, and land masks.

R-0006 should produce a real elevation-to-RGBA depth atlas converter and add debug overlays for each bathymetry channel.

## R-0008 visual debug overlays

R-0008 adds an explicit diagnostic layer for `/cosmos-review`:

```text
src/cosmos/debug/cosmosDebug.ts
src/cosmos/orbital/shaders/debugOverlay.ts
```

Debug modes:

```text
scale ownership       RGB = ocean/cloud/planet
atmosphere ownership  RGB = local-sky/horizon-fog/orbital-rim
cloud LOD             RGB = micro/meso/macro
physical shells       green Earth, cyan cloud base, magenta cloud top, amber atmosphere
composite diagnostic  ownership tint plus shell lines
```

New commands:

```bash
npm run cosmos:review:debug-contract
npm run cosmos:review:debug-screenshots
```

The purpose is to turn ambiguous screenshots into actionable failure classes before making further beauty changes.

## R-0009 physical atmosphere LUT interface

R-0009 adds:

```text
src/cosmos/atmosphere/atmosphereLut.ts
ATMOSPHERE_LUT_GLSL
optical-depth-lut debug mode
```

Atmosphere LUT textures:

```text
transmittance       256×64  RGB=solar transmittance, A=normalized optical depth
multiScattering      64×32  RGB=multiple-scattering tint, A=energy
skyView             192×108 RGB=sky-view radiance proxy, A=horizon/terminator
aerialPerspective    96×64  RGB=aerial-perspective tint, A=fog density
```

New command:

```bash
npm run cosmos:review:atmosphere-lut-contract
```

Debug mode 6:

```text
optical-depth-lut: R=optical depth, G=aerial perspective, B=multi-scattering/rim
```

The current LUT textures are deterministic CPU fallback/interface textures. The next step is local browser shader compile-log capture and twilight/terminator calibration.

## R-0010 runtime shader diagnostics and twilight calibration

R-0010 adds the first runtime browser/WebGL validation gate:

```text
src/cosmos/runtime/runtimeDiagnostics.ts
scripts/cosmos/capture-review-runtime-diagnostics.mjs
scripts/cosmos/report-runtime-diagnostics-contract.mjs
```

New runtime state:

```js
window.__COSMOS_RUNTIME_DIAGNOSTICS__
window.__COSMOS_WEBGL_PROBE__
```

New command:

```bash
npm run cosmos:review:runtime-contract
npm run cosmos:review:runtime-diagnostics
```

Runtime capture modes:

```text
0 beauty render
2 atmosphere ownership
6 optical-depth LUT
```

R-0010 also adds twilight/terminator calibration:

```text
src/cosmos/atmosphere/twilightCalibration.ts
scripts/cosmos/report-twilight-calibration-contract.mjs
```

New review bookmarks:

```text
twilight-limb
low-twilight-horizon
```

New command:

```bash
npm run cosmos:review:twilight-contract
```

The calibration rule is strict: do not tune rim colour, ozone, haze, or aerial perspective until the runtime diagnostics packet reports zero shader compile errors, zero program link errors, zero page errors, and no WebGL context loss.

## R-0011 shader-clean twilight calibration

R-0011 upgrades the R-0010 twilight target system from simple camera-altitude checks to representative atmosphere path samples:

```text
src/cosmos/atmosphere/atmosphereCalibration.ts
src/test/cosmos-atmosphere-calibration.test.ts
scripts/cosmos/report-atmosphere-calibration-contract.mjs
```

New runtime state:

```js
window.__COSMOS_ATMOSPHERE_CALIBRATION_STATE__
```

New command:

```bash
npm run cosmos:review:atmosphere-calibration
```

Critical shader correction:

```text
optical-depth-lut debug mode now uses uSunDir instead of a fixed up-vector
```

The R-0011 static calibration targets are:

```text
cloud-terminator       limb-shell-path
twilight-limb          limb-shell-path
low-twilight-horizon   low-horizon-path
```

The next step is local browser runtime validation with:

```bash
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
```

After that gate is clean, R-0012 can upgrade the CPU fallback LUTs toward a higher-fidelity transmittance and multi-scattering solver.
