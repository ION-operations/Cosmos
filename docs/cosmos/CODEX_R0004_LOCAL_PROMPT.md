# Codex CLI handoff prompt — Cosmos R-0004 local data/bootstrap

Paste this into the customized local Codex CLI from the folder that contains the Cosmos patch zips.

```text
You are Codex running locally for Project Cosmos Water World. Use the newest patch zip first: Cosmos_WaterWorld_v0_4_R0004_gibs_surface_overlay_runtime.zip. If it is not present, use Cosmos_WaterWorld_v0_3_R0003_weather_atlas_unification.zip and apply/merge the R-0004 changes from the provided patch context. Do not rewrite the architecture; preserve earth-forge as the master runtime.

Goal: complete R-0004 locally by downloading the first NASA GIBS global true-color surface atlas, validating the build, and capturing review screenshots for lead-eyes critique.

Work directory:
  Cosmos/earth-forge

Required commands:
  npm ci
  npm run cosmos:gibs:global-snapshot
  npm run build
  npm run test
  npm run lint
  npm i -D playwright
  npx playwright install chromium
  npm run cosmos:review:screenshots

Expected local data outputs:
  public/cosmos/gibs/global-truecolor.jpg
  public/cosmos/gibs/global-truecolor.manifest.json

Expected screenshot outputs:
  docs/cosmos/validation/screenshots/R0004/orbit.png
  docs/cosmos/validation/screenshots/R0004/cloud-terminator.png
  docs/cosmos/validation/screenshots/R0004/high-altitude.png
  docs/cosmos/validation/screenshots/R0004/storm-zone.png
  docs/cosmos/validation/screenshots/R0004/sun-glitter.png
  docs/cosmos/validation/screenshots/R0004/sea-level.png
  docs/cosmos/validation/screenshots/R0004/underwater.png

Open these review URLs manually if needed:
  /cosmos-review?bookmark=orbit&panel=1
  /cosmos-review?bookmark=cloud-terminator&panel=1
  /cosmos-review?bookmark=storm-zone&panel=1
  /cosmos-review?bookmark=sun-glitter&panel=1
  /cosmos-review?bookmark=sea-level&panel=1
  /cosmos-review?bookmark=underwater&panel=1

Validation/reporting requirements:
  1. Preserve the procedural fallback if the GIBS download fails.
  2. Preserve all seven bookmark IDs exactly.
  3. Confirm the UI data panel reports GIBS state `loaded`, layer, and time after the WMS atlas downloads.
  4. Save command logs under docs/cosmos/validation/ with R0004-local names.
  5. Produce a short R0004_LOCAL_RUN.md with: commands run, pass/fail table, GIBS manifest summary, screenshot paths, and any visual anomalies.
  6. Do not commit node_modules, dist, or browser binaries.

If the WMS global snapshot fails, inspect the URL in scripts/cosmos/fetch-gibs-global-snapshot.mjs and try a conservative retry with smaller size:
  COSMOS_GIBS_WIDTH=1024 COSMOS_GIBS_HEIGHT=512 npm run cosmos:gibs:global-snapshot

The R-0005 candidate is bathymetry/depth raster plumbing for shallow-water color, shelf breaks, coastal foam, underwater fog, and caustics.
```
