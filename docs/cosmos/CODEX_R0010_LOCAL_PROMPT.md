# Codex local prompt — Cosmos R-0010

You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

```text
Cosmos_WaterWorld_v0_10_R0010_runtime_shader_twilight.zip
```

Goal:
complete R-0010 locally by running build/test/lint, generating all static contracts, installing Playwright, and capturing browser runtime shader diagnostics plus twilight/terminator review screenshots.

Work directory:

```bash
cd Cosmos/earth-forge
```

Required validation:

```bash
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
```

Runtime browser diagnostics:

```bash
npm i -D playwright
npx playwright install chromium
npm run cosmos:review:runtime-diagnostics
```

Strict failure gate:

```bash
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
```

Expected static outputs:

```text
docs/cosmos/validation/scale/R0010/bookmark-scale-contract.md
docs/cosmos/validation/atmosphere/R0010/atmosphere-continuity-contract.md
docs/cosmos/validation/debug/R0010/debug-overlay-contract.md
docs/cosmos/validation/atmosphere/R0010/atmosphere-lut-contract.md
docs/cosmos/validation/runtime/R0010/runtime-diagnostics-contract.md
docs/cosmos/validation/atmosphere/R0010/twilight-calibration-contract.md
```

Expected runtime outputs:

```text
docs/cosmos/validation/runtime/R0010/runtime-diagnostics.json
docs/cosmos/validation/runtime/R0010/runtime-diagnostics.md
docs/cosmos/validation/runtime/R0010/screenshots/*.png
```

Manual review URLs:

```text
/cosmos-review?bookmark=cloud-terminator&panel=1
/cosmos-review?bookmark=twilight-limb&panel=1
/cosmos-review?bookmark=low-twilight-horizon&panel=1
```

Debug modes for manual review:

```text
0 beauty render
2 atmosphere ownership
6 optical-depth LUT
```

Create:

```text
docs/cosmos/R0010_LOCAL_RUN.md
```

Include:

```text
commands run
pass/fail table
runtime diagnostics summary
shader compile/program link error counts
page error counts
WebGL context loss state
screenshot paths
visual anomalies
lead-eyes notes if available
```

Do not commit or package:

```text
node_modules
dist
browser binaries
```

R-0011 candidate after successful runtime capture:

```text
Calibrate twilight/terminator defaults and start the higher-fidelity atmosphere solver upgrade only after shader/program/page diagnostics are clean.
```
