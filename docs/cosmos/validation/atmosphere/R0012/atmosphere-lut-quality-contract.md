# Cosmos R-0012 atmosphere LUT quality contract

R-0012 replaces the R-0011 heuristic LUT generator with a curved-path optical-depth fallback solver. The model still runs on CPU/DataTexture for WebGL compatibility, but its inputs are now ray/sphere atmosphere paths, altitude density integration, ozone band density, and Rayleigh/Mie phase functions.

## LUT dimensions

| Texture | Resolution |
|---|---:|
| transmittance | 320×80 |
| multiScattering | 96×48 |
| skyView | 240×135 |
| aerialPerspective | 128×72 |

## Optical probes

| Probe | Rayleigh depth | Mie depth | Ozone depth | Optical depth | Aerial perspective |
|---|---:|---:|---:|---:|---:|
| surfaceGrazing | 42.759 | 122.730 | 11.587 | 1.000 | 0.860 |
| stratosphericLimb | 1.990 | 0.000 | 25.225 | 0.435 | 0.081 |
| highZenith | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |

## Assertions

| Assertion | Status |
|---|---|
| LUT dimensions upgraded beyond R-0011 fallback | pass |
| curved optical-depth integrator present | pass |
| ozone band gate present | pass |
| phase functions present | pass |
| debug LUT export script registered | pass |
| surface grazing has stronger optical depth than stratospheric limb | pass |
| stratospheric limb has stronger optical depth than high zenith | pass |
| low horizon remains aerial-perspective heavy | pass |

Overall: pass

Texture export command: `npm run cosmos:review:atmosphere-lut-export`.