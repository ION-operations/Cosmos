# Validation summary — R-0010 runtime shader diagnostics and twilight calibration

## Commands run in sandbox

```bash
npm ci --dry-run --no-audit --no-fund
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

## Results

| Check | Status | Notes |
|---|---|---|
| npm ci dry run | Passed | Dependency tree dry-run only. |
| Full npm ci | Not completed in sandbox | Existing dependency tree from R-0009 was reused for validation; local Codex should run full `npm ci`. |
| Build | Passed | Vite production build completed; chunk-size warning only. |
| Tests | Passed | 12 files / 33 tests. |
| Lint | Passed | Existing warning-only issues remain. |
| Scale contract | Passed | R0010 includes original seven bookmarks plus twilight review bookmarks. |
| Atmosphere continuity contract | Passed | Ground/orbit ownership separation preserved. |
| Debug overlay contract | Passed | Optical-depth-LUT mode retained as mode 6. |
| Atmosphere LUT contract | Passed | LUT interface still valid. |
| Runtime diagnostics contract | Passed | Static contract generated. |
| Twilight calibration contract | Passed | `cloud-terminator`, `twilight-limb`, and `low-twilight-horizon` targets generated. |
| Playwright runtime diagnostics | Not run in sandbox | Requires local Playwright/Chromium/GPU/WebGL environment. |

## Key logs

```text
docs/cosmos/validation/build_R0010.log
docs/cosmos/validation/test_R0010.log
docs/cosmos/validation/lint_R0010.log
docs/cosmos/validation/runtime/R0010/runtime-diagnostics-contract.md
docs/cosmos/validation/atmosphere/R0010/twilight-calibration-contract.md
```

## Local follow-up

```bash
npm ci
npm i -D playwright
npx playwright install chromium
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
```
