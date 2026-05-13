# Cosmos next-session bootstrap

Current release: **R-0012 — higher-fidelity atmosphere LUT solver**.

## Current renderer spine

```text
earth-forge master shell
/cosmos-review route
fixed Earth scale contract
weather-atlas macro cloud/ocean coupling
bathymetry one-water interface
visual debug overlays
physical atmosphere LUT interface
runtime WebGL diagnostics gate
R-0012 curved-path atmosphere LUT fallback solver
```

## What R-0012 changed

- Added `src/cosmos/atmosphere/atmospherePhysics.ts`.
- Upgraded CPU fallback atmosphere LUT generation from heuristic altitude/sun-angle response to curved ray/sphere optical-depth integration.
- Added Rayleigh/Mie phase helpers and ozone-band density.
- Increased fallback LUT texture resolutions.
- Added LUT quality contract and PNG texture export.
- Fixed atmosphere LUT state emission in `WorldEngine.ts`.

## Immediate local Codex command packet

```bash
cd Cosmos/earth-forge
npm ci
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:review:scale-contract
npm run cosmos:review:atmosphere-contract
npm run cosmos:review:debug-contract
npm run cosmos:review:atmosphere-lut-contract
npm run cosmos:review:runtime-contract
npm run cosmos:review:twilight-contract
npm run cosmos:review:atmosphere-calibration
npm run cosmos:review:atmosphere-lut-quality
npm run cosmos:review:atmosphere-lut-export
npm i -D playwright
npx playwright install chromium
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
npm run cosmos:review:debug-screenshots
npm run cosmos:review:screenshots
```

## Review targets

```text
/cosmos-review?bookmark=cloud-terminator&panel=1
/cosmos-review?bookmark=twilight-limb&panel=1
/cosmos-review?bookmark=low-twilight-horizon&panel=1
```

Capture/inspect:

```text
mode 0 = beauty
mode 2 = atmosphere ownership
mode 6 = optical-depth LUT
```

## Next build candidate

**R-0013: GPU/precomputed atmosphere generation path or runtime-calibrated atmosphere tuning.**

Do not move into beauty-only tuning until the local R-0012 runtime diagnostics show zero shader/program/page errors.
