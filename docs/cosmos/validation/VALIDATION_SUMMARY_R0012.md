# Cosmos R-0012 validation summary

## Status

| Check | Status |
|---|---|
| `npm ci --no-audit --no-fund` | Passed, but sandbox command timeout wrapper interrupted after packages were installed |
| `npm run build` | Passed |
| Vitest | Passed — 14 files / 42 tests |
| `npm run lint` | Passed with existing warning-only issues |
| Scale contract | Passed |
| Atmosphere continuity contract | Passed |
| Debug overlay contract | Passed |
| Atmosphere LUT contract | Passed |
| Runtime diagnostics contract | Passed statically |
| Twilight contract | Passed statically |
| R-0012 atmosphere calibration contract | Passed |
| R-0012 atmosphere LUT quality contract | Passed |
| R-0012 LUT texture export | Passed |
| Playwright runtime browser diagnostics | Not run in sandbox |

## New R-0012 outputs

```text
docs/cosmos/validation/atmosphere/R0012/atmosphere-lut-contract.md
docs/cosmos/validation/atmosphere/R0012/atmosphere-calibration-contract.md
docs/cosmos/validation/atmosphere/R0012/atmosphere-lut-quality-contract.md
docs/cosmos/validation/atmosphere/R0012/lut-textures/transmittance.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/multiScattering.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/skyView.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/aerialPerspective.png
docs/cosmos/validation/atmosphere/R0012/lut-textures/manifest.json
```

## Notes

The strict local browser gate remains:

```bash
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
```

R-0012 should be reviewed in mode `0`, mode `2`, and mode `6` for `cloud-terminator`, `twilight-limb`, and `low-twilight-horizon`.
