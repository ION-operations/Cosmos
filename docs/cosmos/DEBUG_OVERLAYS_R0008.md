# Cosmos R-0008 — Visual Debug Overlays

R-0008 adds a diagnostic layer for the issue identified in lead-eyes review: screenshots alone can look bad without revealing whether the failure is scale, atmosphere ownership, cloud LOD, or pure art direction.

## Runtime entry point

Route:

```text
/cosmos-review
```

New UI section:

```text
Visual diagnostics
```

New browser state:

```js
window.__COSMOS_DEBUG_OVERLAY_STATE__
window.__COSMOS_ENGINE__
```

`window.__COSMOS_ENGINE__` is exposed only for local diagnostic automation. It lets Playwright switch debug modes without rebuilding or using the panel.

## Debug modes

| Mode | Key | Diagnostic purpose | Color contract |
|---:|---|---|---|
| 0 | `off` | normal beauty render | no overlay |
| 1 | `scale-ownership` | ocean/cloud/planet pass ownership | red=ocean, green=cloud, blue=planet/orbital |
| 2 | `atmosphere-ownership` | local sky/horizon/orbital rim handoff | red=local sky, green=horizon fog, blue=orbital rim |
| 3 | `cloud-lod` | cloud detail ownership | red=micro, green=meso, blue=macro |
| 4 | `physical-shells` | fixed Earth/cloud/atmosphere shell alignment | green=Earth, cyan=cloud base, magenta=cloud top, amber=atmosphere |
| 5 | `composite-diagnostic` | combined ownership + shell lines | ownership tint plus shell colors |

## New runtime files

```text
src/cosmos/debug/cosmosDebug.ts
src/cosmos/orbital/shaders/debugOverlay.ts
src/test/cosmos-debug-overlays.test.ts
scripts/cosmos/report-debug-overlay-contract.mjs
scripts/cosmos/capture-review-debug-overlays.mjs
```

## Why this matters

The goal is to separate the four most common failure classes:

```text
1. Actual visual art-direction failure.
2. Incorrect pass ownership while zooming.
3. Atmosphere handoff failure between local sky and orbital rim.
4. Cloud LOD mismatch where close-up noise survives into orbit or macro weather disappears too early.
```

With R-0008, lead-eyes notes should cite:

```text
bookmark id
normal screenshot
debug mode id
failure description
```

Example:

```text
storm-zone, mode 1: green cloud ownership is correct, but cloud mass still looks too flat; tune cloud shader, not scale transition.
```

## Local capture commands

```bash
npm run cosmos:review:debug-contract
npm run cosmos:review:screenshots
npm run cosmos:review:debug-screenshots
```

The debug screenshot script writes to:

```text
docs/cosmos/validation/screenshots/R0008-debug/
```

## R-0008 acceptance gate

R-0008 is accepted when:

```text
build passes
tests pass
lint has no blocking errors
debug contract report is generated
all debug modes are available from the Cosmos Review panel
local Playwright can capture normal and diagnostic screenshot packets
```
