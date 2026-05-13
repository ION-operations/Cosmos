# Codex CLI local prompt — R-0005 bathymetry and one-water validation

Paste into Codex CLI from the folder containing the patch zip.

```text
You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

  Cosmos_WaterWorld_v0_5_R0005_bathymetry_one_water_intake.zip

Goal:
Complete local R-0005 validation by generating or downloading the first real bathymetry/depth raster, validating the build, and capturing visual review screenshots.

Work directory:

  Cosmos/earth-forge

Required commands:

  npm ci
  npm run cosmos:bathymetry:procedural
  npm run build
  npm run test
  npm run lint

Then attempt the real bathymetry preview:

  npm run cosmos:bathymetry:etopo-wms

If the WMS preview fails, retry smaller:

  COSMOS_BATHYMETRY_WIDTH=1024 COSMOS_BATHYMETRY_HEIGHT=512 npm run cosmos:bathymetry:etopo-wms

Expected bathymetry outputs:

  public/cosmos/bathymetry/global-depth.png
  public/cosmos/bathymetry/global-depth.manifest.json

Then capture review screenshots:

  npm i -D playwright
  npx playwright install chromium
  npm run cosmos:review:screenshots

Open these URLs manually if needed:

  /cosmos-review?bookmark=orbit&panel=1
  /cosmos-review?bookmark=storm-zone&panel=1
  /cosmos-review?bookmark=sun-glitter&panel=1
  /cosmos-review?bookmark=sea-level&panel=1
  /cosmos-review?bookmark=underwater&panel=1

Visual review focus:

  - Does shallow water look like depth-driven water, not a neon overlay?
  - Does abyssal water darken plausibly from orbit and underwater?
  - Does coast foam appear where depth/shore/weather justify it?
  - Does the water read as one material across orbit, sea-level, and underwater?
  - Does the storm-zone water show macro weather energy without uniform foam?
  - Are cloud shadows/weather and bathymetry fighting or blending coherently?

Reporting requirements:

  1. Save logs under docs/cosmos/validation/ using R0005-local suffixes.
  2. Preserve all seven bookmark ids exactly.
  3. Confirm the Bathymetry data status panel shows loaded/fallback/error accurately.
  4. Produce docs/cosmos/R0005_LOCAL_RUN.md with:
     - commands run
     - pass/fail table
     - bathymetry manifest summary
     - screenshot paths
     - visual anomalies
  5. Do not commit node_modules, dist, or browser binaries.

R-0006 candidate:
Build a real elevation-to-RGBA depth-atlas converter from NOAA ETOPO/GEBCO data and add debug channel overlays for depth/shelf/coast/land.
```
