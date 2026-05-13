# Codex CLI prompt — Cosmos R-0006 local scale-coherence validation

You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

```text
Cosmos_WaterWorld_v0_6_R0006_scale_coherence_ion.zip
```

Goal:
Validate the R-0006 fixed-center scale-coherence patch locally, capture non-image runtime diagnostics, then capture screenshots for lead-eyes review.

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
npm i -D playwright
npx playwright install chromium
npm run cosmos:review:scale-diagnostics
npm run cosmos:review:screenshots
```

Expected static diagnostic outputs:

```text
docs/cosmos/validation/scale/R0006/bookmark-scale-contract.json
docs/cosmos/validation/scale/R0006/bookmark-scale-contract.md
```

Expected Playwright runtime diagnostic outputs:

```text
docs/cosmos/validation/scale/R0006/scale-state.json
docs/cosmos/validation/scale/R0006/scale-state.md
```

Expected screenshot outputs:

```text
docs/cosmos/validation/screenshots/R0006/orbit.png
docs/cosmos/validation/screenshots/R0006/cloud-terminator.png
docs/cosmos/validation/screenshots/R0006/high-altitude.png
docs/cosmos/validation/screenshots/R0006/storm-zone.png
docs/cosmos/validation/screenshots/R0006/sun-glitter.png
docs/cosmos/validation/screenshots/R0006/sea-level.png
docs/cosmos/validation/screenshots/R0006/underwater.png
```

Validation requirements:

1. Confirm `orbit` and `cloud-terminator` report `planetAlpha=1`, `oceanAlpha=0`, `cloudAlpha=0`.
2. Confirm sea-level/sun-glitter/underwater report `oceanAlpha=1`, `cloudAlpha=1`, `planetAlpha=0`.
3. Confirm browser runtime `window.__COSMOS_SCALE_STATE__` exists for every bookmark.
4. Confirm the planet no longer fills orbit frames as a tan/brown near-ground surface patch.
5. Confirm zooming no longer re-centers the planet/cloud frame on camera X/Z movement.
6. Preserve all seven bookmark ids exactly.
7. Write `docs/cosmos/R0006_LOCAL_RUN.md` with commands, pass/fail table, scale-state summary, screenshot paths, and lead-eyes visual anomalies.

Do not commit `node_modules`, `dist`, Playwright browser binaries, or unrelated local data.

Next candidate after R-0006 validation:

```text
R-0007: atmosphere scattering continuity and cloud LOD refinement after fixed-center visual retest.
```
