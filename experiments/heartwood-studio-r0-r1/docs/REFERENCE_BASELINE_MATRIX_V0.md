# Heartwood High-Water Reference Baseline Matrix v0

## Correction

The scaffold must not define weaker gates than the material already supplied.

Regression does not mean worse than this new scaffold. Regression means worse than any accepted or supplied high-water reference for that aspect.

## Current high-water sources already recognized

1. Current Heartwood labs R4/R5 and aspect workbenches.
2. CODEX5.3TREES production monolith and parameters.
3. Procedural_trees_rocks / HyperTree modular reference.
4. Tree Kernel vNext and HyperTree vNext plans.
5. Earth Kernel / soil / hydro / FlowGuide-MPM notes.
6. Visual reference boards and species images.
7. Legacy OPUSTree / ProVeg maps as historical donor references.

## Regression definition

A candidate is a regression if it removes, weakens, hides, or replaces a known reference capability with a simpler fake, even when the candidate passes a structural gate.

Passing a gate is not enough. The candidate must also preserve the high-water feature list below.

## Branch architecture baseline

High-water sources:

- CODEX5.3 Tree3DPreview branching system.
- Heartwood R4 A/B skeleton harness.
- Heartwood R5 CODEX element integration candidate.
- aspect workbench branch route.

Required preserved capabilities:

- scaffold branch rhythm, not even radial spokes
- graph-owned parent/child hierarchy
- branch order awareness
- max-order / recursion budget
- species-dependent branch angles
- branch angle variance
- branch probability / density
- child budget and twig budget
- length decay and radius decay
- self-weight sag
- phototropic recovery / growth bias
- wind-memory bias
- apical dominance
- reiteration / secondary leader possibility
- dead or broken limb support
- terminal classification for every tip
- foliage-hidden skeleton still recognizable by species

Forbidden regressions:

- anonymous renderer limbs
- generic tree silhouette
- twig spaghetti
- branch tubes glued onto trunk
- branch distribution independent of species
- leaf mass hiding failed skeleton

## Trunk / Leader baseline

High-water sources:

- Tree Kernel vNext.
- HyperTree vNext plan.
- CODEX trunk gesture and bark/root panels.
- Heartwood R5 trunk controls.

Required preserved capabilities:

- trunk is order-0 Leader continuing into crown
- no separate capped trunk primitive
- taper
- flare
- ovality
- fluting
- trunk gesture knots
- lean
- twist
- age/height relationship
- base/root transition
- species-dependent trunk habit

Forbidden regressions:

- flat pole ending under canopy
- trunk top disconnect
- straight cylinder with branches pasted on
- lost trunk knots/gesture
- lost base flare

## Junction / collar baseline

High-water sources:

- Tree Kernel branch collar truth.
- HyperTree C1 UnionZone plan.
- CODEX collar / union parameters.
- visual branch collar references.

Required preserved capabilities:

- buried child base
- C1 continuity
- collar ridge
- lower compression shoulder
- bark grain/ridge wrapping around union
- parent-child radius constraint
- no spherical metaball bulb as final truth
- no hard socket seam
- union masks available to render/material layer

Forbidden regressions:

- glued tube
- ball blob at every branch
- child branch appears surface-mounted
- collar lost when mesh is simplified
- junction material disconnected from geometry

## Endpoint / damage baseline

High-water sources:

- CODEX cutMask, splinterMask, branchBinding, junctionMask attributes.
- Heartwood R5 broken cap/deadwood direction.
- Tree Kernel stamp/cut/scar memory.

Required preserved capabilities:

- no unresolved terminal ends
- living tip
- dormant bud
- twig fan
- leaf terminal
- needle terminal
- dead stub
- snapped limb
- old cut
- scarred cut
- rot cavity
- occluded root terminal
- cut masks
- splinter masks
- deadwood controls
- break severity
- future cut/scar stamp ownership

Forbidden regressions:

- arbitrary flat caps
- all endpoints natural taper only
- deadwood removed
- cut/splinter masks ignored
- damage as pure texture with no graph ownership

## Roots / buttress baseline

High-water sources:

- CODEX root parameters.
- Earth Kernel / Arbor-Terra notes.
- Tree Kernel roots belong to ground requirement.
- visual root flare and buttress references.

Required preserved capabilities:

- root emergence from trunk mass
- flare/buttress tie-in
- root architecture by species
- surface crawl roots
- subroot splitting
- ground entry / occluded terminal states
- fluting tie-in to trunk
- future soil phi adapter boundary
- future hydrotropism and obstacle deflection hooks

Forbidden regressions:

- roots sitting on top of surface
- generic spokes
- no trunk/root transition
- disconnected soil/root logic
- roots only decorative curves

## Bark / tissue baseline

High-water sources:

- CODEX bark noise and panel controls.
- Tree Kernel material truth W(x).
- HyperTree tissue coordinates.
- visual bark references.

Required preserved capabilities:

- species-specific bark modes
- bark relief
- anisotropy
- bark scale
- junction scar/ridge tie-in
- topology-aware bark masks
- future cambium/sapwood/heartwood fields
- future ring/knot/scar/cut tissue mapping

Forbidden regressions:

- generic brown noise
- bark disconnected from branch unions
- same bark for every species
- no tissue future path
- bark hides geometry failures

## Foliage / needles / willow strands baseline

High-water sources:

- CODEX leaf parameter set.
- Heartwood species boards.
- HYPERREAL_TREE_VISION_THE_DREAM.
- Quick Grass performance concept.

Required preserved capabilities:

- species-specific foliage modes
- broadleaf support
- oak leaf identity
- birch triangular leaf identity
- pine needle fascicles
- willow pendant strands
- acacia bipinnate leaflet/fine canopy texture
- density and clustering controls
- petiole/strand droop support
- silhouette breakup
- leaf-hidden skeleton still valid

Forbidden regressions:

- generic green billboards
- pine rendered as broadleaf cards
- willow rendered as normal leafy blob
- acacia rendered as oak-like round crown
- foliage used to cover bad branch architecture

## Wind / load baseline

High-water sources:

- Tree Kernel rotation-driven wind.
- CODEX wind parameter set.
- HyperTree two-phase wind solver.

Required preserved capabilities:

- branch order stiffness
- parent-child coupling
- bottom-up drag / top-down force inheritance
- sag/load memory
- torsion
- canopy shear / lag / wake
- leaf flutter separated from structural sway
- future node rotation texture / quaternion-like node motion

Forbidden regressions:

- uniform sine-wave offset
- rubber hose translation
- leaf and trunk moved by same noise
- no mass/stiffness/damping distinction
- wind independent of hierarchy

## Soil / root / hydro future boundary

High-water sources:

- Earth Kernel v2.
- soil/hydro/MLS-MPM/gravity/overhang notes.
- Arbor-Terra eco-kernel.

Required preserved capabilities:

- terrain truth remains sparse phi/SDF
- HydroTiles remain fluid authority
- FlowGuide-MPM is guidance, not replacement
- terrain/fluid edits are stamp logged
- roots may influence cohesion and moisture later
- overhang/support logic remains future-compatible

Forbidden regressions:

- global heightfield replacing phi truth
- unstamped terrain mutation
- MPM replacing HydroTiles
- fake soil contact not owned by terrain/root state

## Operational rule

Before any gate is promoted, the candidate must attach a Reference Parity Report listing:

- aspect
- candidate id
- source references checked
- required features preserved
- required features missing
- known regressions
- improvements
- promotion decision

If the report cannot be produced, the status is `blocked`, not `passed`.
