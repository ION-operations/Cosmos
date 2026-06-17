# Visual Inspection and Fallback Requirements

## Purpose

Heartwood cannot be developed blind.

Every aspect page must have an inspectable visual state, a debug overlay, and a fallback renderer path. WebGPU can be the advanced path, but WebGL must exist for visual auditing when WebGPU is unavailable, broken, or too opaque.

## Renderer policy

Heartwood uses two renderer lanes:

1. **WebGPU lane**
   - raw WGSL validation and future compute/geometry/material passes
   - authoritative buffer debugging
   - performance target for advanced features

2. **WebGL fallback lane**
   - R3F/Three debug rendering
   - cylinder/spline/surface proxy geometry
   - guaranteed visual inspection for every graph state
   - available even when WebGPU setup fails

No feature may exist only as invisible GPU state.

## Required visual pages

| Page | Scope | Must show |
|---|---|---|
| Full Tree | integrated specimen | whole tree, species selector, validation state, reference status |
| Graph Inventory | atlas coverage | 665-param / 1539-edge coverage, missing/partial/regressed counts |
| Branch Architecture | branch skeleton | order colors, parent-child ids, branch rhythm, terminal markers |
| Trunk / Leader | order-0 spine | Leader continuation, taper, flare, ovality, fluting, trunk gesture knots |
| Junction / Collar | branch unions | buried child base, collar ridge, compression shoulder, C1 metric overlay |
| Roots / Buttress | base/root system | root flare, buttress, crawl roots, ground entry, occluded terminals |
| Bark Surface | material/tissue | relief, anisotropy, bark scale, junction masks, species bark target |
| Foliage | broadleaf/acacia | leaf clusters, density, petioles, silhouette breakup, species identity |
| Needles / Strands | pine/willow | needle fascicles, willow pendant strand chains, droop vectors |
| Endpoints / Damage | tips/cuts/deadwood | endpoint taxonomy, dead stubs, snapped limbs, cut/splinter masks |
| Wind / Load | motion | branch order stiffness, parent coupling, sag/load memory, leaf flutter only |
| Reference Oracle | target comparison | source reference, candidate screenshot, required features, forbidden failures |
| GPU Diagnostics | runtime | WebGPU availability, smoke pass value, buffer readback, shader compile status |

## Debug overlays required on all aspect pages

- node id
- parent id
- branch order
- endpoint state
- terminal treatment
- branchBinding
- junctionMask
- cutMask
- splinterMask
- species profile id
- source parameter ids
- current gate status
- reference parity status

## Screenshot policy

Every promotable candidate must provide screenshots for:

1. aspect-only page
2. full-tree page with foliage hidden
3. full-tree page with final foliage/materials visible
4. reference oracle comparison page

## Promotion condition

If the feature cannot be seen, isolated, and compared, it is not promotable.

If WebGPU fails, WebGL fallback must still show the same graph state and enough proxy geometry to inspect correctness.
