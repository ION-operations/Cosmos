# Cosmos R-0006 scale-coherence patch

## Lead-eyes report absorbed

Local R-0004 review images were useful enough to expose the failure class, but not sufficient for exact diagnosis. The recurring issue was not only color or cloud art direction; it was a renderer-coordinate issue:

- orbital planet scale shifted relative to camera movement;
- clouds changed apparent scale during zoom instead of staying tied to altitude above Earth;
- atmosphere/planet/ocean passes did not share the same altitude and transition state;
- screenshots alone did not expose the pass-fade or altitude numbers needed to debug this cleanly.

## Root cause fixed

The orbital planet center was effectively tied to the camera X/Z coordinates in shader/runtime paths. That made the planet behave like a local patch instead of a fixed Earth sphere. R-0006 moves the review renderer to a fixed Earth center:

```text
Earth radius: 6,371,000 m
Atmosphere radius: 6,471,000 m
Planet center: (0, -6,371,000, 0)
Camera altitude: length(camera - center) - Earth radius
```

This removes the false-scale behavior where moving or zooming the camera changed the planet/cloud/atmosphere reference frame.

## New scale contract

Added:

```text
src/cosmos/scale/cosmosScale.ts
src/test/cosmos-scale.test.ts
```

The contract owns:

- fixed planet center;
- Earth/atmosphere radii;
- camera altitude calculation;
- LOD classification;
- ocean/cloud/planet pass alpha cross-fades;
- cloud-base/top transition values.

## Shader changes

Added `SCALE_GLSL` to:

```text
src/cosmos/orbital/shaders/common.ts
```

Integrated into:

```text
src/cosmos/orbital/shaders/ocean.ts
src/cosmos/orbital/shaders/clouds.ts
src/cosmos/orbital/shaders/planet.ts
```

### Planet pass

- Uses `uCosmosPlanetCenter` instead of camera-relative center.
- Uses `uCosmosEarthRadius` for intersection.
- Uses `uCosmosAtmosphereRadius` for rim glow.
- Uses `uCosmosPlanetPassAlpha` for near-space/orbit transition.
- Moderates local GIBS surface overlay toward Water World rather than letting tan land/cloud pixels dominate.

### Cloud pass

- Replaced flat local cloud slab with spherical shell intersection.
- Uses altitude above Earth shell for base/top density.
- Uses planar weather sampling near sea level and sphere-UV weather sampling from higher altitude.
- Uses `uCosmosCloudPassAlpha` to suppress local volumetric pass once orbital planet/cloud composition should take over.

### Ocean pass

- Uses the fixed center for curvature normal blending.
- Uses `uCosmosOceanPassAlpha` to fade projected-grid ocean out before orbital planet pass.
- Keeps bathymetry/one-water coupling intact.

## GLSL transition cleanup

R-0006 also replaces several reversed-edge `smoothstep` calls in the orbital shaders with explicit inverse fades. This avoids implementation-dependent WebGL behavior during the very transitions we are trying to judge: atmosphere rim, cloud top fade, foam threshold, close-up micro-normal fade, moon/star masks, and far whitecap caps.

## Runtime diagnostics

Added non-image diagnostics because images alone were not precise enough:

```text
scripts/cosmos/report-bookmark-scale-contract.mjs
scripts/cosmos/capture-review-scale-state.mjs
```

Package scripts:

```bash
npm run cosmos:review:scale-contract
npm run cosmos:review:scale-diagnostics
```

`scale-contract` runs without a browser and writes:

```text
docs/cosmos/validation/scale/R0006/bookmark-scale-contract.json
docs/cosmos/validation/scale/R0006/bookmark-scale-contract.md
```

`scale-diagnostics` uses Playwright locally and records browser runtime state per bookmark:

```text
docs/cosmos/validation/scale/R0006/scale-state.json
docs/cosmos/validation/scale/R0006/scale-state.md
```

## Current expected bookmark scale contract

```text
orbit             orbital       ocean=0 cloud=0 planet=1
cloud-terminator  orbital       ocean=0 cloud=0 planet=1
high-altitude     low-altitude  ocean=1 cloud=1 planet=0
storm-zone        low-altitude  ocean=1 cloud=1 planet=0
sun-glitter       surface       ocean=1 cloud=1 planet=0
sea-level         surface       ocean=1 cloud=1 planet=0
underwater        surface       ocean=1 cloud=1 planet=0
```

This is intentionally strict for the R-0006 stabilization pass. After local review, we can soften the near-space transition range if the handoff between local and orbital passes is visibly abrupt.

## Next visual review focus

Run local diagnostics and screenshot capture together. The useful review packet is now:

```text
1. screenshot PNG
2. scale-state JSON row
3. bookmark id
4. lead-eyes note
```

That combination lets us tell whether a flaw is art direction, shader scale, data overlay, or pass-compositing.
