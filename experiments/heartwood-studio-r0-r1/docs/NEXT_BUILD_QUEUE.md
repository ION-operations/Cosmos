# Next Build Queue

## HW-R0-001 — Boot real app

Status: scaffolded.

- Vite package scaffold
- React app shell
- workbench nav
- validation panel
- TreeGraph inspector

## HW-R0-002 — Complete blocked entry files

Status: blocked by connector safety checks.

Required manual/local files:

- `index.html`
- `src/gpu/wgsl/validationSmoke.wgsl`

The required contents are documented in `BUILD_RECEIPT_R0_R1.md` and `WGSL_VALIDATION_SMOKE.md`.

## HW-R0-003 — Wire Reference Oracle to uploaded image pack

Status: metadata scaffolded.

- Extract visual reference boards into `public/references`.
- Map each image to species/aspect/reference id.
- Replace hardcoded inline Reference Oracle records with `referenceManifest.ts`.

## HW-R1-001 — Replace demo graph with imported HyperTree data

Status: pending.

- Inspect Procedural_trees_rocks modules.
- Define adapter from HyperTree branch/root/trunk generators to TreeGraph.
- Preserve ids, parent ids, order, age, mass, stiffness, damping, endpoint state, and UnionZone ownership.

## HW-R1-002 — Endpoint resolver

Status: pending.

- Classify every terminal.
- Block arbitrary flat caps.
- Add debug endpoint markers.

## HW-R2-001 — UnionZone generator

Status: pending.

- Replace blob/junction inflation with buried child + collar + ridge.
- Add C1 continuity metric.
