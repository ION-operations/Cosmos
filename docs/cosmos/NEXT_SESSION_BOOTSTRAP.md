# Cosmos next-session bootstrap

Current master branch choice: **earth-forge**.

Current patch: **Water World v0.4 / R-0004**.

## Current renderer state

- R-0001 established the deterministic Cosmos weather atlas in the main Water World route.
- R-0002 added `/cosmos-review`, the orbital/ocean review route, and seven fixed visual bookmarks.
- R-0003 unified the weather atlas across orbital planet, cloud, and ocean shaders.
- R-0004 added the first real-data surface raster overlay path for the orbital planet pass.

## R-0004 additions

- Added `src/cosmos/gibs/gibsSurfaceOverlay.ts` for local NASA GIBS surface atlas loading, status reporting, and safe fallback texture creation.
- Added `scripts/cosmos/fetch-gibs-global-snapshot.mjs` and package script `npm run cosmos:gibs:global-snapshot`.
- Added expected public data location:
  - `public/cosmos/gibs/global-truecolor.jpg`
  - `public/cosmos/gibs/global-truecolor.manifest.json`
- Updated `src/cosmos/orbital/shaders/planet.ts` so the procedural water-world surface can blend an optional real GIBS true-color atlas.
- Added GIBS blend and water-world bias controls to `/cosmos-review`.
- Added runtime GIBS status readout to the review UI.
- Added `src/test/cosmos-gibs-surface-overlay.test.ts`.
- Updated screenshot capture output path to `docs/cosmos/validation/screenshots/R0004`.

## Validation run for R-0004

```bash
npm ci --dry-run --no-audit --no-fund
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:gibs:global-snapshot
```

Status:

- Build: passed.
- Test: passed, 4 files / 6 tests.
- Lint: passed with existing warning-class items only.
- `npm ci --dry-run`: passed.
- GIBS global snapshot: failed in sandbox with DNS `EAI_AGAIN`; retry locally.
- Playwright screenshots: not run in sandbox; run locally after installing Playwright.

## Immediate local Codex task

Use `docs/cosmos/CODEX_R0004_LOCAL_PROMPT.md`. The key local commands are:

```bash
cd Cosmos/earth-forge
npm ci
npm run cosmos:gibs:global-snapshot
npm run build
npm run test
npm run lint
npm i -D playwright
npx playwright install chromium
npm run cosmos:review:screenshots
```

## Next engineering move

R-0005 should start the bathymetry/depth raster interface for shallow-water color, shoreline foam, shelf-break water, underwater fog density, caustic strength, and depth-correct sea colour.
