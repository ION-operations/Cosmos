# Cosmos R-0011 atmosphere LUT contract

This report is static and screenshot-independent. It verifies the shader-clean physical-atmosphere LUT interface for transmittance, multiple scattering, sky-view radiance, aerial perspective, and optical-depth debug review.

## LUT textures

| Texture | Resolution | Encoding |
|---|---:|---|
| transmittance | 256×64 | RGB=solar transmittance, A=normalized optical depth |
| multiScattering | 64×32 | RGB=multiple-scattering tint, A=energy |
| skyView | 192×108 | RGB=sky-view radiance proxy, A=horizon/terminator |
| aerialPerspective | 96×64 | RGB=aerial-perspective tint, A=fog density |

## Bookmark optical-state samples

| Bookmark | Alt km | Optical depth | Aerial perspective | Local sky | Orbital rim |
|---|---:|---:|---:|---:|---:|
| orbit | 26470.904 | 0.000 | 0.000 | 0.00 | 1.00 |
| cloud-terminator | 23582.892 | 0.000 | 0.000 | 0.00 | 1.00 |
| twilight-limb | 25363.291 | 0.000 | 0.000 | 0.00 | 1.00 |
| high-altitude | 8.401 | 0.150 | 0.596 | 1.00 | 0.00 |
| storm-zone | 1.200 | 0.304 | 0.620 | 1.00 | 0.00 |
| sun-glitter | 0.260 | 0.398 | 0.620 | 1.00 | 0.00 |
| sea-level | 0.004 | 0.434 | 0.620 | 1.00 | 0.00 |
| low-twilight-horizon | 0.008 | 0.433 | 0.620 | 1.00 | 0.00 |
| underwater | -0.003 | 0.434 | 0.620 | 1.00 | 0.00 |

Expected direction: sea-level and storm-zone views carry strong aerial perspective; orbit and cloud-terminator views suppress local sky and hand off to orbital rim/LUT transmittance.