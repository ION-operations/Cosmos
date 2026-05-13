# Cosmos local Codex workflow — R-0004

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
document.documentElement.dataset.cosmosBookmark
```

## GIBS local data bootstrap

Metadata/tile scripts from R-0003:

```bash
npm run cosmos:gibs:capabilities
npm run cosmos:gibs:catalog
npm run cosmos:gibs:preview-tile
```

R-0004 global surface atlas script:

```bash
npm run cosmos:gibs:global-snapshot
```

Expected runtime files:

```text
public/cosmos/gibs/global-truecolor.jpg
public/cosmos/gibs/global-truecolor.manifest.json
```

The `/cosmos-review` planet shader consumes these automatically through `src/cosmos/gibs/gibsSurfaceOverlay.ts`. If the files are absent or fail to load, it uses a neutral safe fallback texture and keeps rendering.

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

Output:

```text
docs/cosmos/validation/screenshots/R0004/*.png
```

## Codex handoff prompt

Use:

```text
docs/cosmos/CODEX_R0004_LOCAL_PROMPT.md
```

## Guardrails

- Keep review bookmark IDs stable.
- Do not remove the procedural atlas fallback.
- Do not commit `node_modules`, `dist`, or Playwright browser binaries.
- Preserve GIBS layer/time metadata in `global-truecolor.manifest.json`.
- Do not overfit a single screenshot; improve repeated behavior across orbit, altitude, sea level, and underwater.
