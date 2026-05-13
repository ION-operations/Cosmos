# Codex local prompt — R-0009 physical atmosphere LUT

You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

```text
Cosmos_WaterWorld_v0_9_R0009_physical_atmosphere_lut.zip
```

Goal: complete local browser validation for R-0009 by running the physical-atmosphere LUT interface, collecting normal and debug screenshots, and recording any WebGL shader/runtime issues.

Work directory:

```bash
cd Cosmos/earth-forge
```

Core validation:

```bash
npm ci
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:review:scale-contract
npm run cosmos:review:atmosphere-contract
npm run cosmos:review:debug-contract
npm run cosmos:review:atmosphere-lut-contract
```

Browser validation:

```bash
npm i -D playwright
npx playwright install chromium
npm run cosmos:review:scale-diagnostics
npm run cosmos:review:screenshots
npm run cosmos:review:debug-screenshots
```

Expected diagnostic outputs:

```text
docs/cosmos/validation/atmosphere/R0009/atmosphere-lut-contract.md
docs/cosmos/validation/debug/R0009/debug-overlay-contract.md
docs/cosmos/validation/scale/R0009/scale-state.md
docs/cosmos/validation/screenshots/R0009/*.png
docs/cosmos/validation/screenshots/R0009-debug/*mode-6*.png
```

Manual review URLs:

```text
/cosmos-review?bookmark=orbit&panel=1
/cosmos-review?bookmark=cloud-terminator&panel=1
/cosmos-review?bookmark=high-altitude&panel=1
/cosmos-review?bookmark=storm-zone&panel=1
/cosmos-review?bookmark=sun-glitter&panel=1
/cosmos-review?bookmark=sea-level&panel=1
/cosmos-review?bookmark=underwater&panel=1
```

For each bookmark, test debug mode:

```text
6 optical-depth-lut
```

Record:

```text
- WebGL shader compile errors or warnings
- UI atmosphere LUT state packet
- whether optical-depth red channel appears at sea-level/horizon and suppresses in orbit
- whether horizon haze, rim thickness, and cloud lighting remain coherent
- whether atmosphere LUT controls cause stable changes without camera-scale artifacts
```

Create:

```text
docs/cosmos/R0009_LOCAL_RUN.md
```

Include:

```text
commands run
pass/fail table
browser console/WebGL errors
screenshot paths
lead-eyes notes by bookmark
R-0010 recommendation
```

Do not commit or package:

```text
node_modules
dist
browser binaries
```

R-0010 candidate: runtime WebGL shader compile/log capture and twilight/terminator calibration using the R-0009 optical-depth debug mode.
