# Cosmos local Codex workflow — R-0005

Use this when running the customized local Codex CLI on the project machine. Codex can install dependencies, fetch data, run browser captures, and preserve continuity artifacts.

## Working directory

```bash
cd Cosmos/earth-forge
```

## Baseline commands

```bash
npm ci
npm run build
npm run test
npm run lint
npm run dev
```

## Review route

```text
/cosmos-review
```

Screenshot-friendly URLs:

```text
/cosmos-review?bookmark=orbit&panel=0
/cosmos-review?bookmark=cloud-terminator&panel=0
/cosmos-review?bookmark=high-altitude&panel=0
/cosmos-review?bookmark=storm-zone&panel=0
/cosmos-review?bookmark=sun-glitter&panel=0
/cosmos-review?bookmark=sea-level&panel=0
/cosmos-review?bookmark=underwater&panel=0
```

The route exposes:

```js
window.__COSMOS_REVIEW_READY__
window.__COSMOS_ACTIVE_BOOKMARK__
window.__COSMOS_GIBS_SURFACE_OVERLAY_STATE__
window.__COSMOS_BATHYMETRY_OVERLAY_STATE__
document.documentElement.dataset.cosmosBookmark
```

## GIBS local data bootstrap

Metadata/tile scripts from R-0003 and R-0004:

```bash
npm run cosmos:gibs:capabilities
npm run cosmos:gibs:catalog
npm run cosmos:gibs:preview-tile
npm run cosmos:gibs:global-snapshot
```

Expected runtime files:

```text
public/cosmos/gibs/global-truecolor.jpg
public/cosmos/gibs/global-truecolor.manifest.json
```

## Bathymetry/depth bootstrap

Generate the deterministic fallback atlas:

```bash
npm run cosmos:bathymetry:procedural
```

Attempt the NOAA ETOPO WMS preview:

```bash
npm run cosmos:bathymetry:etopo-wms
```

Retry smaller if the service rejects a large WMS image:

```bash
COSMOS_BATHYMETRY_WIDTH=1024 COSMOS_BATHYMETRY_HEIGHT=512 npm run cosmos:bathymetry:etopo-wms
```

Expected runtime files:

```text
public/cosmos/bathymetry/global-depth.png
public/cosmos/bathymetry/global-depth.manifest.json
```

The `/cosmos-review` ocean and planet shaders consume these automatically through `src/cosmos/bathymetry/bathymetryOverlay.ts`. If the files are absent or fail to load, the renderer uses the deterministic procedural fallback and keeps rendering.

## Playwright visual capture

Install browser tooling locally:

```bash
npm i -D playwright
npx playwright install chromium
```

Capture all review bookmarks:

```bash
npm run cosmos:review:screenshots
```

Output currently defaults to the active script path. Keep R-0005 local captures under:

```text
docs/cosmos/validation/screenshots/R0005/*.png
```

## Codex handoff prompt

Use:

```text
docs/cosmos/CODEX_R0005_LOCAL_PROMPT.md
```

## Guardrails

- Keep review bookmark IDs stable.
- Do not remove the procedural weather, GIBS, or bathymetry fallbacks.
- Do not commit `node_modules`, `dist`, or Playwright browser binaries.
- Preserve data layer metadata in `global-truecolor.manifest.json` and `global-depth.manifest.json`.
- Do not overfit a single screenshot; improve repeated behavior across orbit, altitude, sea level, and underwater.
- Treat Water.zip as a physical/visual contract: one water body, causal foam/breach, and localized high-detail simulation.
