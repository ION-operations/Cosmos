# Cosmos

**Water-world Earth renderer for ION Operations**

Cosmos is a cinematic Earth and ocean rendering lab. It is built to make visual changes auditable: every major rendering pass is paired with fixed review bookmarks, validation logs, source receipts, and local capture tooling. The current runtime spans orbit, cloud terminator, high altitude, storm zone, sun glitter, sea level, and underwater views.

**Status:** active prototype through **Water World v0.12 / R-0012**.

---

## Project Page

The GitHub Pages site is live at:

```text
https://ion-operations.github.io/Cosmos/
```

The hosted Pages workflow lives at `.github/workflows/pages.yml`. It publishes a static project page from `pages/` plus committed review/runtime assets in `public/cosmos/`, so Pages deployment does not need to install dependencies, commit `dist/`, or carry browser binaries.

Local app routes:

| Route | Purpose |
| --- | --- |
| `/` | Public Cosmos project page when running the Vite app locally |
| `/lab` | Main interactive renderer |
| `/cosmos-review` | Fixed lead-eyes review bookmarks and diagnostics panel |
| `/cosmos-local-run` | Local command/output console |
| `/gpu` | WebGPU/WebGL2 experimental renderer |

---

## Current Evidence

| Area | Current State |
| --- | --- |
| Release spine | R0001 through R0012 drops integrated |
| Surface atlas | `2048x1024` NASA GIBS true-color WMS snapshot with procedural fallback |
| Bathymetry | Local procedural depth atlas plus NOAA/GEBCO intake scaffolding |
| Atmosphere | R0012 CPU atmosphere LUT solver, calibration contracts, and runtime diagnostics |
| Review bookmarks | 7 stable IDs |
| Validation | build / test / lint / review contracts under `docs/cosmos/validation/` |

R0004 screenshot outputs remain the canonical visual baseline:

```text
docs/cosmos/validation/screenshots/R0004/orbit.png
docs/cosmos/validation/screenshots/R0004/cloud-terminator.png
docs/cosmos/validation/screenshots/R0004/high-altitude.png
docs/cosmos/validation/screenshots/R0004/storm-zone.png
docs/cosmos/validation/screenshots/R0004/sun-glitter.png
docs/cosmos/validation/screenshots/R0004/sea-level.png
docs/cosmos/validation/screenshots/R0004/underwater.png
```

---

## Evolution Spine

| Release | Focus |
| --- | --- |
| R0001 | Weather atlas spine |
| R0002 | Orbital review route |
| R0003 | Weather atlas unification |
| R0004 | GIBS surface overlay runtime |
| R0005 | Bathymetry and one-water intake |
| R0006 | Scale coherence contract |
| R0007 | Atmosphere/cloud LOD |
| R0008 | Visual debug overlays |
| R0009 | Physical atmosphere LUT |
| R0010 | Runtime shader twilight diagnostics |
| R0011 | Shader clean twilight calibration |
| R0012 | Atmosphere LUT solver |

---

## Architecture

| System | Purpose |
| --- | --- |
| Weather atlas spine | Shared macro weather fields for ocean and clouds |
| GIBS surface overlay | NASA true-color atlas intake with procedural fallback |
| Bathymetry overlay | Depth, shelf, coast, and land-channel plumbing for water optics |
| Atmosphere LUT stack | Deterministic CPU-generated atmosphere lookup textures and calibration contracts |
| Runtime diagnostics | WebGL/runtime shader probes surfaced in review tooling |
| Local capture harness | Playwright/canvas screenshot workflow with bookmark filters |
| ION receipts | Phase records, validation summaries, and next-session context |

Cosmos follows ION repository design principles:

- visible evidence before claims;
- stable IDs for repeatable review;
- local-first validation logs;
- concise public README with deeper docs in `docs/cosmos/`;
- phase receipts for each material change.

---

## Run Locally

```bash
npm ci
npm run dev
```

Open the Vite URL printed by the dev server, usually:

```text
http://127.0.0.1:8080/
```

---

## Validate

```bash
npm run build
npm run test
npm run lint
```

Useful Cosmos review commands:

```bash
npm run cosmos:review:scale-contract
npm run cosmos:review:atmosphere-contract
npm run cosmos:review:atmosphere-lut-contract
npm run cosmos:review:runtime-contract
npm run cosmos:review:twilight-contract
npm run cosmos:review:atmosphere-calibration
npm run cosmos:review:atmosphere-lut-quality
```

R0004 capture workflow:

```bash
npm run cosmos:gibs:global-snapshot
npm run cosmos:review:screenshots
```

Subset capture example:

```bash
COSMOS_REVIEW_BOOKMARKS=storm-zone,sea-level npm run cosmos:review:screenshots
```

---

## GitHub Pages Deployment

1. Push `main` to `ION-operations/Cosmos`.
2. In GitHub repository settings, keep Pages source set to **GitHub Actions**.
3. Run the `Deploy Cosmos GitHub Pages` workflow.

The workflow:

- checks out the repository;
- copies `pages/` into a temporary `dist/` artifact;
- copies `public/cosmos/pages`, `public/cosmos/gibs`, and `public/cosmos/bathymetry` into that artifact;
- copies `dist/index.html` to `dist/404.html` for a simple fallback;
- deploys the generated artifact to Pages.

---

## Current Visual Findings

The R0004 GIBS overlay successfully loads and reports layer/time in the review UI, but the true-color atlas currently retains too much land/coast signal for a Water World. R0005-R0012 add the plumbing needed to address that gap: bathymetry/depth rasters, shallow-water color, shelf breaks, coastal foam masks, atmosphere LUTs, twilight calibration, and runtime shader diagnostics.

---

## Key Docs

| Document | Purpose |
| --- | --- |
| `docs/cosmos/ION_COSMOS_OPERATING_SYSTEM.md` | Project operating model |
| `docs/cosmos/COSMOS_QUEUE.json` | Current queue |
| `docs/cosmos/COSMOS_DOMAIN_REGISTRY.json` | Ownership map |
| `docs/cosmos/R0004_LOCAL_RUN.md` | Local GIBS/capture report |
| `docs/cosmos/SCALE_COHERENCE_R0006.md` | Scale-coherence contract |
| `docs/cosmos/ATMOSPHERE_CLOUD_LOD_R0007.md` | Atmosphere/cloud LOD plan |
| `docs/cosmos/ATMOSPHERE_LUT_SOLVER_R0012.md` | R0012 atmosphere LUT solver plan |
| `docs/cosmos/GITHUB_PAGES_COSMOS.md` | Pages deployment handoff |

---

## Repository Hygiene

Do not commit:

- `node_modules/`
- `dist/`
- browser binaries
- local cache directories

Commit source, docs, public runtime assets, validation logs, and review screenshots only when they are part of a named phase receipt.
