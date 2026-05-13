# R-0010 runtime shader diagnostics and twilight calibration

R-0010 changes the validation order for Cosmos atmosphere work:

```text
static build/test/lint
→ browser runtime shader/program diagnostics
→ optical-depth / atmosphere ownership screenshots
→ twilight and terminator colour calibration
```

The renderer should not be visually tuned from screenshots alone while shader compile/link failures, WebGL context loss, or page errors are unknown.

## Runtime diagnostics added

New runtime module:

```text
src/cosmos/runtime/runtimeDiagnostics.ts
```

New browser state:

```js
window.__COSMOS_RUNTIME_DIAGNOSTICS__
window.__COSMOS_WEBGL_PROBE__
```

New engine hooks in `src/cosmos/orbital/WorldEngine.ts`:

```text
renderer.debug.checkShaderErrors = true
renderer.debug.onShaderError = runtime diagnostic bridge
webglcontextlost / webglcontextrestored listeners
runtime state callback for CosmosReview UI
```

The runtime packet separates:

```text
shader compile errors
program link/validation errors
Three.js renderer shader diagnostics
page console errors
WebGL context loss/restoration
warning-level shader/program messages
```

## Playwright runtime capture

New script:

```bash
npm run cosmos:review:runtime-diagnostics
```

Script file:

```text
scripts/cosmos/capture-review-runtime-diagnostics.mjs
```

The script:

1. launches the Vite dev server if no `COSMOS_REVIEW_BASE_URL` is supplied;
2. installs a WebGL prototype probe before page scripts execute;
3. captures browser console messages and page errors;
4. visits each review bookmark;
5. captures modes `0`, `2`, and `6`:

```text
0 = beauty render
2 = atmosphere-ownership debug overlay
6 = optical-depth-LUT debug overlay
```

Expected local output:

```text
docs/cosmos/validation/runtime/R0010/runtime-diagnostics.json
docs/cosmos/validation/runtime/R0010/runtime-diagnostics.md
docs/cosmos/validation/runtime/R0010/screenshots/*.png
```

Set this environment variable to make shader/page/runtime errors hard-fail the local run:

```bash
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
```

## Twilight/terminator calibration added

New module:

```text
src/cosmos/atmosphere/twilightCalibration.ts
```

New review bookmarks:

```text
twilight-limb
low-twilight-horizon
```

Original seven bookmark IDs are preserved exactly:

```text
orbit
cloud-terminator
high-altitude
storm-zone
sun-glitter
sea-level
underwater
```

New command:

```bash
npm run cosmos:review:twilight-contract
```

Expected output:

```text
docs/cosmos/validation/atmosphere/R0010/twilight-calibration-contract.json
docs/cosmos/validation/atmosphere/R0010/twilight-calibration-contract.md
```

## Calibration gate

Twilight colour, rim thickness, ozone influence, horizon haze, and aerial perspective should be tuned only after:

```text
runtime diagnostics: ok
shader compile errors: 0
program link errors: 0
page errors: 0
WebGL context lost: false
```

This keeps atmosphere art direction from masking renderer failures.
