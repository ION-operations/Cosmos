# Cosmos R-0012 curved-path twilight calibration contract

R-0012 keeps the R-0011 camera-vs-optical-path separation, but evaluates the calibration probes with the curved-path optical-depth fallback solver.

| Bookmark | Role | Sample role | Optical depth | Aerial perspective | Orbital rim α | Local sky α | Status |
|---|---|---|---:|---:|---:|---:|---|
| cloud-terminator | orbital-terminator | limb-shell-path | 0.224 | 0.156 | 0.960 | 0.000 | pass |
| twilight-limb | orbital-limb | limb-shell-path | 0.435 | 0.081 | 0.960 | 0.000 | pass |
| low-twilight-horizon | sea-level-horizon | low-horizon-path | 0.814 | 0.860 | 0.000 | 0.960 | pass |

## Static shader-clean assertions

| Assertion | Status |
|---|---|
| debug optical-depth overlay uses actual uSunDir | pass |
| R-0012 curved-path integrator is available | pass |
| R-0012 LUT quality report is registered | pass |
| all twilight calibration bookmarks exist | pass |

Overall: pass

Local visual gate remains: `COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics`.