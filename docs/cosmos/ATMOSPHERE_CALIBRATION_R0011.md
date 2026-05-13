# Cosmos R-0011 — shader-clean twilight / terminator calibration

## Purpose

R-0011 turns the R-0010 runtime diagnostics and twilight bookmarks into a stricter calibration packet. The key correction is that orbital twilight calibration should not sample optical depth at the camera altitude. Orbit cameras sit tens of thousands of kilometres away, while the visual rim is caused by a grazing atmospheric shell path. R-0011 therefore separates:

- **camera altitude** for local/orbital ownership and pass fades;
- **representative atmosphere path altitude** for optical-depth and twilight calibration;
- **runtime shader diagnostics** for proving the browser/WebGL path is clean before visual tuning is trusted.

## Core changes

| Area | R-0011 change |
|---|---|
| Optical-depth model | Replaced the saturated linear clamp with a compressed response so mode-6 optical debug has usable dynamic range. |
| Calibration state | Added `src/cosmos/atmosphere/atmosphereCalibration.ts`. |
| Debug overlay | Mode 6 now uses the active `uSunDir`, not a fixed world up-vector. |
| Review UI | `/cosmos-review` now displays R-0011 calibration pass state and target samples. |
| Validation | Added `npm run cosmos:review:atmosphere-calibration`. |

## Static calibration samples

The calibration contract uses three target paths:

| Bookmark | Sample path | Intended visual read |
|---|---|---|
| `cloud-terminator` | 18 km limb-shell path | thin blue terminator with controlled silver cloud edge |
| `twilight-limb` | 25 km ozone-band limb-shell path | compressed blue/indigo rim with restrained ozone warmth |
| `low-twilight-horizon` | 25 m long near-horizon path | local sky/haze ownership, no orbital-rim contribution |

Latest static output:

```text
cloud-terminator      opticalDepth 0.228   aerialPerspective 0.156   rim 0.960   sky 0.000
twilight-limb         opticalDepth 0.289   aerialPerspective 0.081   rim 0.960   sky 0.000
low-twilight-horizon  opticalDepth 0.592   aerialPerspective 0.860   rim 0.000   sky 0.960
```

## Local runtime gate

R-0011 does not claim final visual approval until this command passes locally:

```bash
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
```

The runtime packet should include mode `0`, mode `2`, and mode `6` captures for all bookmarks, especially:

```text
cloud-terminator
twilight-limb
low-twilight-horizon
```

## Known limitation

The LUTs are still deterministic CPU fallback textures. R-0011 improves calibration discipline and debug separability; it does not yet replace the fallback with a Bruneton/Hillaire-grade precomputed atmosphere solver.
