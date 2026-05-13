# Cosmos

**Water-world Earth renderer for ION Operations**

Cosmos is a cinematic Earth and ocean rendering lab. It is built to make visual changes auditable: every major rendering pass is paired with fixed review bookmarks, validation logs, source receipts, and local capture tooling. The current runtime spans orbit, cloud terminator, high altitude, storm zone, sun glitter, sea level, and underwater views.

**Status:** active prototype under visual hardening. The current public page is designed for `ION-operations/Cosmos` GitHub Pages.

---

## Project Page

The repository is prepared for GitHub Pages at:

```text
https://ion-operations.github.io/Cosmos/
```

Local routes:

| Route | Purpose |
| --- | --- |
| `/` | Public Cosmos project page |
| `/lab` | Main interactive renderer |
| `/cosmos-review` | Fixed lead-eyes review bookmarks |
| `/cosmos-local-run` | Local command/output console |
| `/gpu` | WebGPU/WebGL2 experimental renderer |

The Pages workflow lives at `.github/workflows/pages.yml` and builds with `GITHUB_PAGES=true`, which sets the Vite base path to `/Cosmos/`.

---

## Current Evidence

| Area | Current State |
| --- | --- |
| Release spine | R0001 through R0007 drops received |
| GIBS atlas | `2048x1024` NASA GIBS true-color WMS snapshot |
| Review bookmarks | 7 stable IDs |
| Validation | build / test / lint / screenshot logs under `docs/cosmos/validation/` |
| R0004 local run | `docs/cosmos/R0004_LOCAL_RUN.md` |

R0004 screenshot outputs:

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

## Architecture

| System | Purpose |
| --- | --- |
| Weather atlas spine | Shared macro weather fields for ocean and clouds |
| GIBS surface overlay | NASA true-color atlas intake with procedural fallback |
| Orbital review route | Repeatable camera bookmarks and visual critique targets |
| Local capture harness | Playwright/canvas screenshot workflow with resumable bookmark filters |
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

Open:

```text
http://127.0.0.1:8080/
```

If that port is occupied, Vite will print the active local URL.

---

## Validate

```bash
npm run build
npm run test
npm run lint
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

1. Create or connect the repository as `ION-operations/Cosmos`.
2. Push `main`.
3. In GitHub repository settings, enable Pages source: **GitHub Actions**.
4. Run the `Deploy Cosmos GitHub Pages` workflow.

The workflow:

- installs with `npm ci`;
- builds the Vite app with `GITHUB_PAGES=true`;
- copies `dist/index.html` to `dist/404.html` for SPA fallback;
- deploys the `dist/` artifact to Pages.

---

## Current Visual Findings

The R0004 GIBS overlay successfully loads and reports layer/time in the review UI, but the true-color atlas currently retains too much land/coast signal for a Water World. The next hardening passes should prioritize:

- bathymetry/depth raster plumbing;
- shallow-water color and shelf breaks;
- coastal foam masks;
- underwater fog and caustics;
- atmosphere/cloud LOD coherence from orbit to sea level.

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

---

## Repository Hygiene

Do not commit:

- `node_modules/`
- `dist/`
- browser binaries
- local cache directories

Commit source, docs, public runtime assets, validation logs, and review screenshots only when they are part of a named phase receipt.
