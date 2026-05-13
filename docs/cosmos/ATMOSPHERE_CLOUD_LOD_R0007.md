# Cosmos R-0007 — Atmosphere continuity and cloud LOD refinement

## Purpose

R-0007 follows the R-0006 fixed-Earth scale correction. The goal is to stop the sky, planet rim, ocean aerial perspective, and cloud layer from behaving like separate scale systems when the camera moves from sea level to orbit.

The patch adds a shared **atmosphere continuity contract**:

```text
camera altitude above fixed Earth shell
  -> local sky ownership
  -> orbital rim ownership
  -> horizon haze / aerial perspective
  -> cloud micro / meso / macro detail ownership
```

This is not a final physically complete atmosphere LUT. It is a stabilization layer that keeps all active shaders obeying the same altitude-derived transition bands before the eventual full scattering implementation.

## Core additions

### Atmosphere continuity state

Added:

```text
src/cosmos/atmosphere/atmosphereContinuity.ts
```

The state computes:

```text
localSkyAlpha
orbitalRimAlpha
horizonFogAlpha
aerialPerspectiveAlpha
cloudMicroAlpha
cloudMesoAlpha
cloudMacroAlpha
opticalDepthScale
terminatorSoftness
```

These values are derived from altitude above the same fixed Earth center introduced in R-0006.

### Shared GLSL contract

Updated:

```text
src/cosmos/orbital/shaders/common.ts
```

Added:

```text
ATMOSPHERE_CONTINUITY_GLSL
```

New shared controls:

```text
uAtmosphereContinuityStrength
uHorizonHazeStrength
uCloudLodBias
```

New shared helper functions:

```text
cosmosLocalSkyContinuity
cosmosAtmosphereContinuityColor
cosmosHorizonWeight
cosmosAerialPerspectiveFactor
cosmosCloudMicroDetailAlpha
cosmosCloudMesoDetailAlpha
cosmosCloudMacroDetailAlpha
```

### Shader ownership changes

| Shader | R-0007 change |
|---|---|
| `sky.ts` | Local sky fades by altitude and horizon haze is tied to the continuity contract. |
| `planet.ts` | Orbital rim glow is moved to a scale-aware atmosphere shell instead of a loose rim artifact. |
| `clouds.ts` | Cloud micro/meso/macro noise bands are separated so orbit does not inherit sea-level texture noise. |
| `ocean.ts` | Aerial perspective uses the same altitude contract as sky and planet. |

## Review controls

`/cosmos-review` now exposes:

```text
Cloud LOD lock
Continuity strength
Horizon haze
```

Use these during lead-eyes review to separate two failure types:

```text
1. wrong atmosphere ownership / transition band
2. wrong art tuning inside an otherwise coherent band
```

## Non-image validation

Added:

```bash
npm run cosmos:review:atmosphere-contract
```

Expected output:

```text
docs/cosmos/validation/atmosphere/R0007/atmosphere-continuity-contract.json
docs/cosmos/validation/atmosphere/R0007/atmosphere-continuity-contract.md
```

The report confirms the intended behavior:

```text
surface bookmarks: local sky/haze/micro cloud detail active
high altitude: macro weather remains, micro detail begins to fade
orbit bookmarks: local sky suppressed, orbital rim ownership active, macro cloud placement preserved
```

## Current limitations

- This is still an analytic/heuristic atmosphere continuity layer, not a full precomputed Rayleigh/Mie multiple-scattering LUT.
- It does not yet add visual debug overlays for the Earth shell, atmosphere shell, cloud base/top, or rim-ownership bands.
- Playwright screenshots and runtime diagnostics must be run locally.
- The GIBS and real bathymetry data paths remain as implemented in earlier patches; R-0007 does not add a new external data provider.

## Next target

R-0008 should add visual debug overlays and local capture packaging:

```text
Earth shell overlay
atmosphere shell overlay
cloud base/top overlay
rim/local-sky ownership overlay
cloud micro/meso/macro LOD overlay
screenshot + diagnostic bundle per bookmark
```
