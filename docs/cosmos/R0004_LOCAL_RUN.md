# R0004 Local Run

Date: 2026-05-12 local / 2026-05-13 UTC
Project: `/home/sev/Cosmos/earth-forge`
Patch source: extracted `Cosmos_WaterWorld_v0_4_R0004_gibs_surface_overlay_runtime`

## Commands Run

Logs are saved under `docs/cosmos/validation/` with `R0004-local-*` names.

| Command | Log | Result | Notes |
| --- | --- | --- | --- |
| `npm ci` | `R0004-local-npm-ci.log` | PASS | Installed 558 packages. npm reported 18 audit findings. |
| `npm run cosmos:gibs:global-snapshot` | `R0004-local-gibs-global-snapshot.log` | PASS | Full `2048x1024` WMS snapshot succeeded; no smaller-raster retry needed. |
| `npm run build` | `R0004-local-build-final.log` | PASS | Vite build passed; chunk-size and stale Browserslist warnings only. |
| `npm run test` | `R0004-local-test-final.log` | PASS | 4 files / 6 tests passed. |
| `npm run lint` | `R0004-local-lint-post-harness.log` | PASS WITH WARNINGS | 13 warnings, 0 errors; existing React hook / fast-refresh warnings. |
| `npm i -D playwright` | `R0004-local-npm-i-playwright.log` | PASS | Added Playwright dev dependency. |
| `npx playwright install chromium` | `R0004-local-playwright-install-chromium.log` | PASS | Chromium installed in user Playwright cache, not the repo. |
| `npm run cosmos:review:screenshots` | `R0004-local-review-screenshots-full-success.log` | PASS | All seven bookmark PNGs captured with GIBS state `loaded`. |
| cleanup smoke | `R0004-local-review-screenshots-cleanup-smoke.log` | PASS | Verified the revised harness exits cleanly after spawning Vite directly. |

## GIBS Manifest Summary

Output atlas:

- `public/cosmos/gibs/global-truecolor.jpg`
- `public/cosmos/gibs/global-truecolor.manifest.json`

Manifest highlights:

- Schema: `cosmos.gibs.globalSurfaceAtlas.v1`
- Endpoint: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`
- Layer: `MODIS_Terra_CorrectedReflectance_TrueColor`
- Time: `2012-07-09`
- Projection: `EPSG:4326`
- BBOX: `[-180, -90, 180, 90]`
- Size: `2048x1024`
- Format: `image/jpeg`
- Bytes: `583384`
- Runtime texture URL: `/cosmos/gibs/global-truecolor.jpg`

Runtime confirmation:

- The review panel reports GIBS `loaded`.
- Screenshot logs confirm layer `MODIS_Terra_CorrectedReflectance_TrueColor`.
- Screenshot logs confirm time `2012-07-09`.
- The procedural fallback remains in `src/cosmos/gibs/gibsSurfaceOverlay.ts` via the neutral texture path for failed atlas loads.

## Screenshot Outputs

All captures are `1920x1080` PNGs under `docs/cosmos/validation/screenshots/R0004/`.

| Bookmark | Path |
| --- | --- |
| `orbit` | `docs/cosmos/validation/screenshots/R0004/orbit.png` |
| `cloud-terminator` | `docs/cosmos/validation/screenshots/R0004/cloud-terminator.png` |
| `high-altitude` | `docs/cosmos/validation/screenshots/R0004/high-altitude.png` |
| `storm-zone` | `docs/cosmos/validation/screenshots/R0004/storm-zone.png` |
| `sun-glitter` | `docs/cosmos/validation/screenshots/R0004/sun-glitter.png` |
| `sea-level` | `docs/cosmos/validation/screenshots/R0004/sea-level.png` |
| `underwater` | `docs/cosmos/validation/screenshots/R0004/underwater.png` |

## Visual Anomalies

Lead-eyes critique from the seven captured images:

- Fake satellite colour: FAIL. The GIBS overlay reads as tan/brown land dominating the globe and sea-level views, not as a water-world surface.
- Bad cloud double-stacking: PARTIAL. Cloud/haze bands are present, but the larger issue is flattened, smeared cloud/atmosphere bands at horizon scale.
- Ocean too flat or too electric-blue: PARTIAL. The close water is not electric-blue, but the orbital/high-altitude water is visually overwhelmed by tan land/overlay colour and loses credible ocean depth.
- Unrealistic coast/land retention: FAIL. Land/coast shapes are too visible for a Water World and become broad tan masks over the water.
- Atmosphere rim thickness: FAIL/PARTIAL. Orbit and terminator views show an overly thin/unclear rim, while sea-level horizons show thick smeared bands.
- Storm-zone scale: FAIL/PARTIAL. The wave surface is active, but storm mass/foam hierarchy is not convincing; tan overlay shapes read through the water.
- Sea-level mismatch with orbital water colour: FAIL. Orbital view is brown/tan, while sea-level water is cyan/green with bright gold glints, so the scales do not agree.

## Local Review Controls Added

- `/cosmos-local-run` provides command stack, bookmark launchers, atlas/report/output links, and screenshot path copy buttons.
- `/cosmos-review` now includes capture/output controls in the review panel.
- The screenshot harness now supports `COSMOS_REVIEW_BOOKMARKS=...` for resumable subsets and captures the WebGL canvas directly for stable clean PNGs.

## R0005 Candidate Notes

The R0005 bathymetry/depth raster plumbing remains the right next candidate. It should supply shallow-water colour, shelf breaks, coastal foam masks, underwater fog, and caustics, and it should also help suppress or reinterpret retained land/coast detail from the true-colour atlas.
