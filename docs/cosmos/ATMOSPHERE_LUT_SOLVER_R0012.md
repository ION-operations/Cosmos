# Cosmos R-0012 — Higher-Fidelity Atmosphere LUT Solver

R-0012 upgrades the physical-atmosphere LUT fallback from a heuristic altitude/sun-angle model into a curved-path optical-depth solver that is still safe for WebGL/DataTexture runtime use.

## What changed

- Added `src/cosmos/atmosphere/atmospherePhysics.ts`.
- Added curved ray/sphere atmosphere integration for view and sun paths.
- Added Rayleigh and forward-Mie phase helpers.
- Added an ozone-band density gate centered near the stratospheric ozone layer.
- Increased fallback LUT resolutions:
  - transmittance: `320×80`
  - multi-scattering: `96×48`
  - sky-view: `240×135`
  - aerial perspective: `128×72`
- Added exported PNG debug textures under `docs/cosmos/validation/atmosphere/R0012/lut-textures/`.
- Fixed the atmosphere LUT state emitter so it uses the current control packet instead of an undefined variable.

## Solver contract

The CPU fallback is not the final Bruneton/Hillaire-grade precomputed atmosphere implementation. It is a higher-fidelity bridge that makes the current WebGL renderer obey a better physical contract before a heavier GPU/precomputed solver is introduced.

The renderer now derives LUT samples from:

```text
Earth radius
atmosphere-top radius
view ray/sphere path length
sun ray/sphere path length
Rayleigh exponential density
Mie exponential density
ozone-band density
Rayleigh phase
Henyey-Greenstein Mie phase
```

## Review artifacts

Run:

```bash
npm run cosmos:review:atmosphere-lut-quality
npm run cosmos:review:atmosphere-lut-export
```

Expected exported files:

```text
docs/cosmos/validation/atmosphere/R0012/lut-textures/transmittance.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/multiScattering.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/skyView.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/aerialPerspective.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/manifest.json
```

## Lead-eyes notes

Use the exported textures to diagnose atmosphere problems without relying only on beauty screenshots:

- `transmittance.png`: should show smooth attenuation bands, not crushed black/white edges.
- `multiScattering.png`: should not create neon rim energy everywhere.
- `skyView.png`: should show horizon/terminator structure without harsh posterization.
- `aerialPerspective.png`: should preserve long-distance haze at low altitude and fade at high altitude.

Runtime browser diagnostics remain mandatory before visual tuning is treated as trustworthy:

```bash
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
```
