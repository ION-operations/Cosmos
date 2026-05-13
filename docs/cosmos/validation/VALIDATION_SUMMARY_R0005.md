# Validation summary — R-0005 bathymetry / one-water intake

## Commands run

| Command | Result |
|---|---:|
| `npm ci --dry-run --no-audit --no-fund` | Pass |
| `npm ci --no-audit --no-fund` | Pass |
| `npm run cosmos:bathymetry:procedural` | Pass |
| `npm run build` | Pass |
| `npm run test` | Pass: 6 files / 12 tests |
| `npm run lint` | Pass with existing warning-only issues |
| `npm run cosmos:bathymetry:etopo-wms` | DNS failed in sandbox: `EAI_AGAIN www.ngdc.noaa.gov` |

## Generated local artifacts

```text
public/cosmos/bathymetry/global-depth.png
public/cosmos/bathymetry/global-depth.manifest.json
```

## Validation logs

```text
docs/cosmos/validation/npm_ci_dry_run_R0005.log
docs/cosmos/validation/bathymetry_procedural_R0005.log
docs/cosmos/validation/build_R0005.log
docs/cosmos/validation/test_R0005.log
docs/cosmos/validation/lint_R0005.log
docs/cosmos/validation/bathymetry_etopo_wms_R0005.log
```

## Notes

The R-0005 bathymetry runtime and shader plumbing are build-tested with a deterministic procedural fallback. Real NOAA/GEBCO bathymetry conversion should be completed locally where DNS/network access to NOAA or GEBCO data endpoints is available.
