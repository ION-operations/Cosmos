# Codex CLI prompt — Cosmos R-0007 local atmosphere continuity validation

You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

```text
Cosmos_WaterWorld_v0_7_R0007_atmosphere_cloud_lod.zip
```

Goal:
Validate the R-0007 atmosphere continuity and cloud LOD patch locally, then capture screenshots and diagnostics for lead-eyes review.

Work directory:

```bash
Cosmos/earth-forge
```

Run:

```bash
npm ci
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:review:scale-contract
npm run cosmos:review:atmosphere-contract
npm i -D playwright
npx playwright install chromium
npm run cosmos:review:scale-diagnostics
npm run cosmos:review:screenshots
```

Expected static diagnostic outputs:

```text
docs/cosmos/validation/scale/R0007/bookmark-scale-contract.json
docs/cosmos/validation/scale/R0007/bookmark-scale-contract.md
docs/cosmos/validation/atmosphere/R0007/atmosphere-continuity-contract.json
docs/cosmos/validation/atmosphere/R0007/atmosphere-continuity-contract.md
```

Expected screenshot outputs:

```text
docs/cosmos/validation/screenshots/R0007/orbit.png
docs/cosmos/validation/screenshots/R0007/cloud-terminator.png
docs/cosmos/validation/screenshots/R0007/high-altitude.png
docs/cosmos/validation/screenshots/R0007/storm-zone.png
docs/cosmos/validation/screenshots/R0007/sun-glitter.png
docs/cosmos/validation/screenshots/R0007/sea-level.png
docs/cosmos/validation/screenshots/R0007/underwater.png
```

Open these manually if needed:

```text
/cosmos-review?bookmark=orbit&panel=1
/cosmos-review?bookmark=cloud-terminator&panel=1
/cosmos-review?bookmark=high-altitude&panel=1
/cosmos-review?bookmark=storm-zone&panel=1
/cosmos-review?bookmark=sun-glitter&panel=1
/cosmos-review?bookmark=sea-level&panel=1
/cosmos-review?bookmark=underwater&panel=1
```

Validation requirements:

1. Confirm all seven bookmark IDs still exist exactly.
2. Confirm `window.__COSMOS_SCALE_STATE__` exists for all bookmarks.
3. Confirm static atmosphere contract shows orbit/cloud-terminator with `orbitalRimAlpha=1` and `localSkyAlpha=0`.
4. Confirm sea-level/sun-glitter/underwater keep `localSkyAlpha=1`, `horizonFogAlpha=1`, and `cloudMicroAlpha=1`.
5. Confirm orbit clouds no longer show excessive sea-level-like micro noise.
6. Confirm high-altitude clouds preserve macro storm/cloud placement while reducing close-detail shimmer.
7. Confirm ocean aerial perspective no longer fights the sky/planet atmosphere transition.
8. Write `docs/cosmos/R0007_LOCAL_RUN.md` with commands, pass/fail table, atmosphere contract summary, screenshot paths, and lead-eyes anomalies.

Do not commit or package:

```text
node_modules
dist
Playwright browser binaries
unrelated local data
```

Next candidate after R-0007 validation:

```text
R-0008: visual debug overlays for Earth shell, atmosphere shell, cloud base/top, rim ownership, and cloud LOD bands.
```
